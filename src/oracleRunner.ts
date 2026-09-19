import * as vscode from 'vscode';
import { getExtensionLocale, readConfig, type UtConfig } from './config';
import { t } from './i18n';
import { parseJUnit } from './junit';
import { logger } from './logger';
import { ensureOracleClient } from './oracleClient';
import { applyCoverageFromXml, applyResultsFromCases, countResults } from './results';
import type { TestStateManager } from './state';

type OraclePool = import('oracledb').Pool;
type OracleConnection = import('oracledb').Connection;

/** Versão mínima do utPLSQL exigida pela extensão (PRD-68 RF4). */
export const UTPLSQL_MIN_VERSION = '3.1.0';

/** Comparação semver simplificada (major.minor.patch); tolera prefixo `v`. */
export function semverLt(a: string, b: string): boolean {
  const pa = a.replace(/^v/, '').split('.');
  const pb = b.replace(/^v/, '').split('.');
  for (let i = 0; i < 3; i++) {
    const x = Number.parseInt(pa[i] ?? '0', 10) || 0;
    const y = Number.parseInt(pb[i] ?? '0', 10) || 0;
    if (x !== y) return x < y;
  }
  return false;
}

export function parseConnString(connStr: string): {
  user: string;
  password: string;
  connectionString: string;
} {
  // Split no último '@' e no primeiro '/' das credenciais, para aceitar
  // senhas contendo '/' ou '@'. O connectString é entregue ao oracledb
  // inalterado (Easy Connect, TNS alias, SID…).
  const at = connStr.lastIndexOf('@');
  const cred = at >= 0 ? connStr.slice(0, at) : connStr;
  const connectionString = at >= 0 ? connStr.slice(at + 1) : '';
  const slash = cred.indexOf('/');
  const user = slash >= 0 ? cred.slice(0, slash) : cred;
  const password = slash >= 0 ? cred.slice(slash + 1) : '';
  if (!user || !connectionString) {
    throw new Error(t(getExtensionLocale(), 'oracleRunner.badConnFormat', { conn: connStr }));
  }
  return { user, password, connectionString };
}

/**
 * Usuário (login) da connection string, em maiúsculas, ou `undefined` se o
 * formato for inválido. Tolera connection sem senha (`user@host/service`) —
 * o que `connStr.split('/')[0]` não faz.
 */
export function connectionUser(connection: string): string | undefined {
  try {
    return parseConnString(connection).user.toUpperCase() || undefined;
  } catch {
    return undefined;
  }
}

let currentPool: { pool: OraclePool; key: string } | undefined;

export async function ensurePool(
  oracledb: typeof import('oracledb'),
  connection: string,
  cfg: UtConfig,
): Promise<OraclePool> {
  const key = `${connection}|${cfg.oraclePoolMin}|${cfg.oraclePoolMax}|${cfg.oraclePoolIncrement}|${cfg.oraclePoolPingInterval}`;
  const client = ensureOracleClient(
    oracledb,
    cfg.oracleClientMode,
    cfg.oracleClientLibDir,
    cfg.oracleClientConfigDir,
  );
  if (client.error) {
    logger.warn('ensurePool: cliente Oracle thick não inicializou', { error: client.error });
  }
  if (currentPool?.key === key) return currentPool.pool;
  await closeOraclePool();
  const parsed = parseConnString(connection);
  const pool = await oracledb.createPool({
    user: parsed.user,
    password: parsed.password,
    connectString: parsed.connectionString,
    poolMin: cfg.oraclePoolMin,
    poolMax: cfg.oraclePoolMax,
    poolIncrement: cfg.oraclePoolIncrement,
    poolPingInterval: cfg.oraclePoolPingInterval,
    stmtCacheSize: 30,
  });
  currentPool = { pool, key };
  return pool;
}

/**
 * Marca o pool para recriação no próximo `ensurePool` (lazy), sem derrubar
 * conexões em uso (PRD-66 RF4).
 */
export function invalidatePool(): void {
  if (currentPool) currentPool.key = '';
}

export async function closeOraclePool(): Promise<void> {
  if (currentPool) {
    await currentPool.pool.close(10).catch(() => {});
    currentPool = undefined;
  }
}

/**
 * Executa `fn` com uma conexão Oracle (pool ou raw) garantindo o fechamento.
 * Retorna `undefined` se a conexão não puder ser aberta (PRD-66 RF5).
 */
export async function withOracleConnection<T>(
  oracledb: typeof import('oracledb'),
  connection: string,
  cfg: UtConfig,
  fn: (conn: OracleConnection) => Promise<T>,
): Promise<T | undefined> {
  const pool = await ensurePool(oracledb, connection, cfg).catch(() => undefined);
  let conn: OracleConnection;
  try {
    conn = pool
      ? await pool.getConnection()
      : await oracledb.getConnection(parseConnString(connection));
  } catch (e) {
    logger.debug('withOracleConnection: falha ao obter conexão', { error: String(e) });
    return undefined;
  }
  try {
    return await fn(conn);
  } finally {
    await conn.close().catch(() => {});
  }
}

export async function acquireRunnerConnections(
  oracledb: typeof import('oracledb'),
  connection: string,
  cfg: UtConfig,
): Promise<{ conn1: OracleConnection; conn2: OracleConnection }> {
  oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;
  const pool = await ensurePool(oracledb, connection, cfg).catch(() => undefined);
  if (pool) {
    const conn1 = await pool.getConnection();
    let conn2: OracleConnection;
    try {
      conn2 = await pool.getConnection();
    } catch (e) {
      // Sem a 2ª conexão, devolve a 1ª ao pool em vez de vazá-la.
      await conn1.close().catch(() => {});
      throw e;
    }
    conn1.callTimeout = 0;
    conn2.callTimeout = 0;
    return { conn1, conn2 };
  }
  const parsed = parseConnString(connection);
  const conn1 = await oracledb.getConnection(parsed);
  let conn2: OracleConnection;
  try {
    conn2 = await oracledb.getConnection(parsed);
  } catch (e) {
    await conn1.close().catch(() => {});
    throw e;
  }
  return { conn1, conn2 };
}

export async function discoverUtplsqlSchema(conn: {
  execute(
    sql: string,
    bindParams?: Record<string, unknown>,
    options?: Record<string, unknown>,
  ): Promise<{ rows?: unknown[] }>;
}): Promise<string> {
  try {
    const result = await conn.execute(
      `SELECT table_owner FROM ALL_SYNONYMS WHERE synonym_name = 'UT_RUNNER' AND owner = 'PUBLIC'`,
      {},
    );
    const rows = result.rows;
    if (rows && rows.length > 0) {
      const owner = (rows[0] as { TABLE_OWNER?: string }).TABLE_OWNER;
      if (owner) return `${owner}.`;
    }
  } catch (e) {
    // ALL_SYNONYMS pode não estar acessível — sem prefixo
    logger.debug('discoverUtplsqlSchema: ALL_SYNONYMS inacessível', { error: String(e) });
  }
  return '';
}

export interface InvalidUt3Object {
  name: string;
  type: string;
}

/**
 * Verifica objetos inválidos no schema utPLSQL (ALL_OBJECTS).
 * Retorna undefined se a conexão falhar ou a query não for acessível
 * (verificação best-effort, nunca lança).
 */
export async function findInvalidUt3Objects(
  oracledb: typeof import('oracledb'),
  connection: string,
  cfg: UtConfig,
): Promise<{ schema: string; invalid: InvalidUt3Object[] } | undefined> {
  const pool = await ensurePool(oracledb, connection, cfg).catch(() => undefined);
  let conn: OracleConnection;
  try {
    conn = pool
      ? await pool.getConnection()
      : await oracledb.getConnection(parseConnString(connection));
  } catch (e) {
    logger.debug('findInvalidUt3Objects: falha ao obter conexão', { error: String(e) });
    return undefined;
  }
  const prevTimeout = conn.callTimeout;
  try {
    conn.callTimeout = 5000;
    const prefix = await discoverUtplsqlSchema(conn);
    const schema = prefix.replace(/\.$/, '') || 'UT3';
    const result = await conn.execute(
      `SELECT object_name, object_type FROM all_objects
       WHERE owner = :schema AND status = 'INVALID'
       AND object_type IN ('PACKAGE','TYPE','PACKAGE BODY')`,
      { schema },
    );
    const invalid: InvalidUt3Object[] = [];
    for (const r of result.rows ?? []) {
      if (Array.isArray(r)) {
        invalid.push({ name: String(r[0]), type: String(r[1]) });
      } else {
        const o = r as { OBJECT_NAME?: unknown; OBJECT_TYPE?: unknown };
        invalid.push({ name: String(o.OBJECT_NAME ?? ''), type: String(o.OBJECT_TYPE ?? '') });
      }
    }
    return { schema, invalid };
  } catch (e) {
    logger.debug('findInvalidUt3Objects: ALL_OBJECTS inacessível', {
      error: String(e),
    });
    return undefined;
  } finally {
    conn.callTimeout = prevTimeout;
    await conn.close().catch(() => {});
  }
}

function extractScalar(row: unknown, colName?: string): string | null {
  if (!row) return null;
  if (Array.isArray(row)) return row[0] != null ? String(row[0]) : null;
  const obj = row as Record<string, unknown>;
  if (colName && obj[colName] != null) return String(obj[colName]);
  const vals = Object.values(obj);
  return vals.length > 0 && vals[0] != null ? String(vals[0]) : null;
}

export async function getOracleInfo(conn: {
  execute(
    sql: string,
    bindParams?: Record<string, unknown>,
    options?: Record<string, unknown>,
  ): Promise<{ rows?: unknown[] }>;
}): Promise<{ utVersion: string | null; dbVersion: string | null }> {
  let utVersion: string | null = null;
  let dbVersion: string | null = null;
  try {
    const r = await conn.execute(`SELECT ut_runner.version() FROM dual`);
    utVersion = extractScalar(r.rows?.[0]);
  } catch (e) {
    // utRunner pode não existir
    logger.debug('getOracleInfo: ut_runner.version indisponível', { error: String(e) });
  }
  try {
    const r = await conn.execute(
      `SELECT version FROM product_component_version WHERE product LIKE '%Oracle%' AND ROWNUM = 1`,
    );
    dbVersion = extractScalar(r.rows?.[0]);
  } catch (e) {
    // query pode não ser acessível
    logger.debug('getOracleInfo: versão do banco indisponível', { error: String(e) });
  }
  return { utVersion, dbVersion };
}

export async function listReportersOracle(conn: {
  execute(
    sql: string,
    bindParams?: Record<string, unknown>,
    options?: Record<string, unknown>,
  ): Promise<{ rows?: unknown[] }>;
}): Promise<string[]> {
  try {
    const result = await conn.execute(
      `SELECT reporter_object_name FROM TABLE(ut_runner.get_reporters_list())`,
    );
    // `get_reporters_list()` devolve o nome qualificado pelo schema
    // (ex.: `UT3.UT_COVERAGE_COBERTURA_REPORTER`); normalizamos para o nome do
    // objeto, que é o que os callers (check de cobertura, QuickPick de
    // reporter) usam.
    return (result.rows ?? []).map((r) => {
      const name = String(extractScalar(r));
      return name.slice(name.lastIndexOf('.') + 1);
    });
  } catch (e) {
    logger.debug('listReportersOracle: ut_runner.get_reporters_list falhou', {
      error: String(e),
    });
    return [];
  }
}

export async function checkReporterExists(
  conn: {
    execute(
      sql: string,
      bindParams?: Record<string, unknown>,
      options?: Record<string, unknown>,
    ): Promise<{ rows?: unknown[] }>;
  },
  reporterName: string,
): Promise<boolean> {
  const bare = (s: string) => s.slice(s.lastIndexOf('.') + 1).toUpperCase();
  const reporters = await listReportersOracle(conn);
  return reporters.some((r) => bare(r) === bare(reporterName));
}

export interface CompilationError {
  name: string;
  type: string;
  line: number;
  position: number;
  text: string;
}

export async function checkCompilationErrors(
  conn: {
    execute(
      sql: string,
      bindParams?: Record<string, unknown>,
      options?: Record<string, unknown>,
    ): Promise<{ rows?: unknown[] }>;
  },
  schema: string,
): Promise<CompilationError[]> {
  try {
    const result = await conn.execute(
      `SELECT name, type, line, position, text
       FROM ALL_ERRORS
       WHERE owner = :schema
         AND type IN ('PACKAGE','PACKAGE BODY','FUNCTION','PROCEDURE','TRIGGER')
         AND attribute = 'ERROR'
       ORDER BY name, type, sequence`,
      { schema },
    );
    return (result.rows ?? []).map((r) => {
      if (Array.isArray(r)) {
        return {
          name: String(r[0] ?? ''),
          type: String(r[1] ?? ''),
          line: Number(r[2] ?? 0),
          position: Number(r[3] ?? 0),
          text: String(r[4] ?? ''),
        };
      }
      const o = r as Record<string, unknown>;
      return {
        name: String(o.NAME ?? ''),
        type: String(o.TYPE ?? ''),
        line: Number(o.LINE ?? 0),
        position: Number(o.POSITION ?? 0),
        text: String(o.TEXT ?? ''),
      };
    });
  } catch (e) {
    logger.debug('checkCompilationErrors: ALL_ERRORS inacessível', { schema, error: String(e) });
    return [];
  }
}

export interface OracleRunOptions {
  /** Connection string (user/pass@//host:port/service) */
  connection: string;
  /** Path args para ut_runner.run (ex.: ['package', 'package.proc']) */
  pathArgs: string[];
  /** Se true, coleta e aplica cobertura Cobertura */
  coverage: boolean;
  /** Caminho base do código-fonte para mapeamento de cobertura */
  sourcePath: string;
  /** fsPath do workspace folder raiz */
  root: string;
  /** TestRun atual do VSCode */
  run: vscode.TestRun;
  /** TestItems leaf (suites ou tests individuais) a executar */
  leafTests: vscode.TestItem[];
  /** State manager compartilhado */
  state: TestStateManager;
  /** Callback opcional ao finalizar com contagem de resultados */
  onComplete?: (
    passed: number,
    failed: number,
    skipped: number,
    errored: number,
    durationMs: number,
  ) => void;
  /** Workspace folders para resolução de sourceUri */
  folders?: readonly vscode.WorkspaceFolder[];
  /** Extra reporters adicionados via config */
  additionalReporters?: string[];
  /** Owner do schema para coverage (override) */
  coverageOwner?: string;
  /** Se true, captura DBMS_OUTPUT */
  dbmsOutput?: boolean;
  /** Timeout em minutos (0 = sem timeout) */
  timeoutMinutes?: number;
}

type LoadedOracledb = typeof import('oracledb');

async function loadOracledb(): Promise<LoadedOracledb | undefined> {
  try {
    const mod = await import('oracledb');
    return ((mod as Record<string, unknown>).default as LoadedOracledb) ?? (mod as LoadedOracledb);
  } catch (e) {
    logger.debug('loadOracledb: oracledb indisponível', { error: String(e) });
    return undefined;
  }
}

export async function executeRunOracle(
  options: OracleRunOptions,
  token: vscode.CancellationToken,
  loadOracledbMod: () => Promise<LoadedOracledb | undefined> = loadOracledb,
): Promise<void> {
  const {
    connection,
    pathArgs,
    coverage,
    sourcePath,
    root,
    run,
    leafTests,
    state,
    onComplete,
    folders,
    additionalReporters,
    coverageOwner,
    dbmsOutput,
    timeoutMinutes,
  } = options;

  const oracledb = await loadOracledbMod();
  if (!oracledb) {
    throw new Error(t(getExtensionLocale(), 'common.oracledbMissing'));
  }

  const cfg = readConfig();
  const { conn1, conn2 } = await acquireRunnerConnections(oracledb, connection, cfg);

  try {
    const utSchema = await discoverUtplsqlSchema(conn1);

    await conn1.execute(`DELETE FROM ${utSchema}UT_OUTPUT_BUFFER_TMP`, {}, { autoCommit: true });
    await conn1.execute(
      `DELETE FROM ${utSchema}UT_OUTPUT_BUFFER_INFO_TMP`,
      {},
      { autoCommit: true },
    );

    const runners = ['ut_documentation_reporter()', 'ut_junit_reporter()'];

    let coverageEnabled = coverage;
    if (coverage) {
      const hasReporter = await checkReporterExists(conn1, 'UT_COVERAGE_COBERTURA_REPORTER');
      if (!hasReporter) {
        coverageEnabled = false;
        run.appendOutput(`\r\n${t(getExtensionLocale(), 'runner.reporterMissing')}\r\n`);
      } else {
        runners.push('ut_coverage_cobertura_reporter()');
      }
    }

    // Reporter adicional volátil da sessão (PRD-68 RF2): consumo único.
    const sessionReporter = state.consumeExtraReporter?.();
    const extraReporters = [...(additionalReporters ?? [])];
    if (sessionReporter) {
      extraReporters.push(sessionReporter);
      run.appendOutput(
        `\r\n${t(getExtensionLocale(), 'runner.extraReporter', { name: sessionReporter })}\r\n`,
      );
    }

    // Validar reporter adicional evita que um nome inexistente aborte todo o
    // `ut_runner.run` com ORA. Lista indisponível (best-effort) → não bloqueia.
    const knownReporters = extraReporters.length > 0 ? await listReportersOracle(conn1) : [];

    for (const r of extraReporters) {
      const normalized = r.toLowerCase().replace(/\(\)$/, '');
      // Só aceita identificadores PL/SQL simples: o nome vem de settings (que
      // podem ser definidas pelo workspace) e é concatenado no PL/SQL abaixo.
      if (!/^[a-z0-9_]+$/.test(normalized)) {
        logger.warn('reporter adicional ignorado (nome inválido)', { reporter: r });
        continue;
      }
      if (
        normalized === 'ut_documentation_reporter' ||
        normalized === 'ut_junit_reporter' ||
        (coverageEnabled && normalized === 'ut_coverage_cobertura_reporter')
      ) {
        continue;
      }
      if (runners.some((existing) => existing.startsWith(normalized))) continue;
      if (
        knownReporters.length > 0 &&
        !knownReporters.some((k) => k.toLowerCase() === normalized)
      ) {
        logger.warn('reporter adicional inexistente ignorado', { reporter: r });
        run.appendOutput(
          `\r\n${t(getExtensionLocale(), 'runner.reporterUnknown', { name: r })}\r\n`,
        );
        continue;
      }
      runners.push(`${normalized}()`);
    }

    const pathsList =
      pathArgs.length > 0 ? pathArgs.map((p) => `'${p.replace(/'/g, "''")}'`).join(',') : '';

    const owner = (coverageOwner ?? '').trim() || parseConnString(connection).user.toUpperCase();

    // Sem `a_source_file_mappings`: o reporter Cobertura então usa
    // `filename="<tipo> <schema>.<objeto>"`, que `mapDbPathsToFiles` converte
    // para caminhos locais (`packages/OBJ.sql`, etc.). Passar o diretório
    // `sourcePath` como `a_file_paths` (diretório, não arquivos) zerava a
    // cobertura — ver PRD-64 e testes de `mapDbPathsToFiles`.
    let coverageSchemes = 'null';
    if (coverageEnabled) {
      coverageSchemes = `ut_varchar2_list('${owner.replace(/'/g, "''")}')`;
    }

    const plsql = `BEGIN ut_runner.run(
      a_paths => ut_varchar2_list(${pathsList}),
      a_reporters => ut_reporters(${runners.join(',')}),
      a_coverage_schemes => ${coverageSchemes}
    ); END;`;

    if (dbmsOutput) {
      try {
        // DBMS_OUTPUT é por sessão: habilita em conn1, que executa os testes.
        await conn1.execute(`BEGIN DBMS_OUTPUT.ENABLE(NULL); END;`);
      } catch (e) {
        logger.debug('executeRunOracle: DBMS_OUTPUT.ENABLE falhou', { error: String(e) });
      }
    }

    const runnerStart = Date.now();
    const runnerPromise = conn1.execute(plsql, {}, { autoCommit: true });

    let lastMsgId = 0;
    let xmlBuffer = '';
    // O reporter JUnit emite o DBMS_OUTPUT capturado dentro de
    // `<system-out><![CDATA[...]]></system-out>`. As linhas de conteúdo e o
    // fechamento `]]>` não começam com '<', então precisam ser roteadas para o
    // XML enquanto um CDATA estiver aberto (senão o parse do JUnit quebra).
    let inCdata = false;

    const cancelRun = () => {
      conn1.break().catch(() => {});
      conn2.break().catch(() => {});
    };
    let wakeRun: () => void = () => {};
    const woken = new Promise<void>((resolve) => {
      wakeRun = resolve;
    });
    const cancelSub = token.onCancellationRequested(() => {
      cancelRun();
      wakeRun();
    });
    const timeoutMs = (timeoutMinutes ?? 0) * 60 * 1000;
    const timeoutTimer =
      timeoutMs > 0
        ? setTimeout(() => {
            cancelRun();
            wakeRun();
          }, timeoutMs)
        : undefined;

    try {
      while (true) {
        const done = await Promise.race([
          runnerPromise.then(() => true),
          woken.then(() => true),
          new Promise<boolean>((r) => setTimeout(() => r(false), 200)),
        ]);

        try {
          const rows = await conn2.execute(
            `SELECT message_id, text, is_finished FROM ${utSchema}UT_OUTPUT_BUFFER_TMP WHERE message_id > :last ORDER BY message_id`,
            { last: lastMsgId },
          );

          for (const row of rows.rows ?? []) {
            const r = row as unknown as { MESSAGE_ID: number; TEXT: string | null };
            lastMsgId = r.MESSAGE_ID;
            const text = r.TEXT;
            if (text) {
              if (inCdata || text.startsWith('<')) {
                xmlBuffer += `${text}\n`;
                if (text.includes('<![CDATA[')) inCdata = true;
                if (text.includes(']]>')) inCdata = false;
              } else {
                run.appendOutput(`${text}\r\n`);
              }
            }
          }
        } catch (e) {
          // polling pode falhar se conn1 ainda não escreveu — ignorar
          logger.debug('executeRunOracle: poll do buffer falhou', { error: String(e) });
        }

        if (done) break;
      }
    } finally {
      cancelSub.dispose();
      if (timeoutTimer) clearTimeout(timeoutTimer);
    }

    if (dbmsOutput) {
      try {
        // Drena a mesma sessão (conn1) que rodou os testes.
        for (;;) {
          const r = await conn1.execute(`BEGIN DBMS_OUTPUT.GET_LINE(:line, :status); END;`, {
            line: { dir: oracledb.BIND_OUT, type: oracledb.STRING, maxSize: 32767 },
            status: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
          });
          const out = (r.outBinds ?? {}) as { line?: unknown; status?: unknown };
          if (Number(out.status) !== 0 || out.line == null) break;
          run.appendOutput(`${String(out.line)}\r\n`);
        }
      } catch (e) {
        // DBMS_OUTPUT pode não estar habilitado
        logger.debug('executeRunOracle: DBMS_OUTPUT indisponível', { error: String(e) });
      }
    }

    const runnerMs = Date.now() - runnerStart;

    const covStart = xmlBuffer.indexOf('<coverage');
    const junitPart = covStart > 0 ? xmlBuffer.substring(0, covStart) : xmlBuffer;
    const covXml = covStart > 0 ? xmlBuffer.substring(covStart) : '';

    const cases = parseJUnit(junitPart);
    const resultMap = applyResultsFromCases(cases, leafTests, run, state);
    state.setLastResults(resultMap);
    state.setLastFailedItems(
      leafTests.filter((t) => {
        const r = resultMap.get(t.id);
        return r?.status === 'failed' || r?.status === 'error';
      }),
    );
    void vscode.commands.executeCommand(
      'setContext',
      'utplsql:hasFailures',
      state.getLastFailedItems().length > 0,
    );

    if (onComplete) {
      const r = countResults(cases);
      onComplete(r.passed, r.failed, r.skipped, r.errored, r.totalMs);
    }

    if (coverageEnabled) {
      if (covXml.trim()) {
        const mappedXml = mapDbPathsToFiles(covXml);
        applyCoverageFromXml(mappedXml, sourcePath, root, run, state, folders);
      } else {
        run.appendOutput(`\r\n${t(getExtensionLocale(), 'oracleRunner.coverNotGenerated')}\r\n`);
      }
    }

    run.appendOutput(
      `\r\n${t(getExtensionLocale(), 'runner.oracleInfo', { ms: runnerMs, chars: junitPart.length })}\r\n`,
    );
  } finally {
    await conn1.close().catch(() => {});
    await conn2.close().catch(() => {});
  }
}

const COVERAGE_DIRS: Record<string, string> = {
  function: 'functions',
  procedure: 'procedures',
  'package body': 'packages',
  package: 'packages',
  'type body': 'types',
  type: 'types',
  view: 'views',
  trigger: 'triggers',
};

export function mapDbPathsToFiles(covXml: string): string {
  return covXml.replace(
    /filename="(function|procedure|package body|package|type body|type|view|trigger)\s+[\w$#]+\.([\w$#]+)"/g,
    (_match, type: string, name: string) => {
      const dir = COVERAGE_DIRS[type] ?? `${type}s`;
      return `filename="${dir}/${name}.sql"`;
    },
  );
}
