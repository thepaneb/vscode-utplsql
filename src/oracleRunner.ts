import * as vscode from 'vscode';
import { getExtensionLocale, readConfig, type UtConfig } from './config';
import { t } from './i18n';
import { parseJUnit } from './junit';
import { applyCoverageFromXml, applyResultsFromCases, countResults } from './results';
import type { TestStateManager } from './state';

type OraclePool = import('oracledb').Pool;
type OracleConnection = import('oracledb').Connection;

export function parseConnString(connStr: string): {
  user: string;
  password: string;
  connectionString: string;
} {
  const m = connStr.match(/^([^/]+)\/([^@]+)@\/\/([^:]+):(\d+)\/(.+)$/);
  if (!m) {
    throw new Error(
      `Formato de conexão inválido: "${connStr}". Use usuario/senha@//host:porta/servico.`,
    );
  }
  return {
    user: m[1],
    password: m[2],
    connectionString: `${m[3]}:${m[4]}/${m[5]}`,
  };
}

let currentPool: { pool: OraclePool; key: string } | undefined;

export async function ensurePool(
  oracledb: typeof import('oracledb'),
  connection: string,
  cfg: UtConfig,
): Promise<OraclePool> {
  if (currentPool?.key === connection) return currentPool.pool;
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
  currentPool = { pool, key: connection };
  return pool;
}

export async function closeOraclePool(): Promise<void> {
  if (currentPool) {
    await currentPool.pool.close(10).catch(() => {});
    currentPool = undefined;
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
    const conn2 = await pool.getConnection();
    conn1.callTimeout = 0;
    conn2.callTimeout = 0;
    return { conn1, conn2 };
  }
  const parsed = parseConnString(connection);
  return {
    conn1: await oracledb.getConnection(parsed),
    conn2: await oracledb.getConnection(parsed),
  };
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
  } catch {
    // ALL_SYNONYMS pode não estar acessível — sem prefixo
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
  } catch {
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
  } catch {
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
  } catch {
    // utRunner pode não existir
  }
  try {
    const r = await conn.execute(
      `SELECT version FROM product_component_version WHERE product LIKE '%Oracle%' AND ROWNUM = 1`,
    );
    dbVersion = extractScalar(r.rows?.[0]);
  } catch {
    // query pode não ser acessível
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
    return (result.rows ?? []).map((r) => String(extractScalar(r)));
  } catch {
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
  const reporters = await listReportersOracle(conn);
  return reporters.some((r) => r.toUpperCase() === reporterName.toUpperCase());
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
  } catch {
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
  } catch {
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

    for (const r of additionalReporters ?? []) {
      const normalized = r.toLowerCase().replace(/\(\)$/, '');
      if (
        normalized === 'ut_documentation_reporter' ||
        normalized === 'ut_junit_reporter' ||
        (coverageEnabled && normalized === 'ut_coverage_cobertura_reporter')
      ) {
        continue;
      }
      if (!runners.some((existing) => existing.startsWith(normalized))) {
        runners.push(`${normalized}()`);
      }
    }

    const pathsList =
      pathArgs.length > 0 ? pathArgs.map((p) => `'${p.replace(/'/g, "''")}'`).join(',') : '';

    const owner = (coverageOwner ?? '').trim() || connection.split('/')[0].toUpperCase();

    let coverageSchemes = 'null';
    let fileMappings = 'null';
    if (coverageEnabled) {
      coverageSchemes = `ut_varchar2_list('${owner.replace(/'/g, "''")}')`;
      const fileList = `'${sourcePath.replace(/'/g, "''")}'`;
      fileMappings = `ut_file_mapper.build_file_mappings(
        a_object_owner => '${owner.replace(/'/g, "''")}',
        a_file_paths => ut_varchar2_list(${fileList})
      )`;
    }

    const plsql = `BEGIN ut_runner.run(
      a_paths => ut_varchar2_list(${pathsList}),
      a_reporters => ut_reporters(${runners.join(',')}),
      a_coverage_schemes => ${coverageSchemes},
      a_source_file_mappings => ${fileMappings}
    ); END;`;

    const runnerStart = Date.now();
    const runnerPromise = conn1.execute(plsql, {}, { autoCommit: true });

    let lastMsgId = 0;
    let xmlBuffer = '';

    const cancelled = new Promise<void>((resolve) => {
      token.onCancellationRequested(() => {
        conn1.break().catch(() => {});
        conn2.break().catch(() => {});
        resolve();
      });
    });

    const timeoutMs = (timeoutMinutes ?? 0) * 60 * 1000;
    const timeoutPromise = new Promise<boolean>((resolve) => {
      if (timeoutMs <= 0) return;
      setTimeout(() => {
        conn1.break().catch(() => {});
        conn2.break().catch(() => {});
        resolve(true);
      }, timeoutMs);
    });

    while (true) {
      const done = await Promise.race([
        runnerPromise.then(() => true),
        cancelled.then(() => true),
        timeoutPromise,
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
            if (text.startsWith('<')) {
              xmlBuffer += `${text}\n`;
            } else {
              run.appendOutput(`${text}\r\n`);
            }
          }
        }
      } catch {
        // polling pode falhar se conn1 ainda não escreveu — ignorar
      }

      if (done) break;
    }

    if (dbmsOutput) {
      try {
        const dbmsResult = await conn2.execute(
          `DECLARE l_lines DBMS_OUTPUT.CHARARR; l_num NUMBER := 0;
           BEGIN DBMS_OUTPUT.GET_LINES(l_lines, l_num); END;`,
        );
        if (dbmsResult && Array.isArray(dbmsResult)) {
          for (const line of dbmsResult) {
            run.appendOutput(`${String(line)}\r\n`);
          }
        }
      } catch {
        // DBMS_OUTPUT pode não estar habilitado
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
    vscode.commands.executeCommand(
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

export function mapDbPathsToFiles(covXml: string): string {
  return covXml.replace(
    /filename="(function|procedure|package body|package|view|trigger)\s+\w+\.(\w+)"/g,
    (_match, type: string, name: string) => {
      const dir = type === 'package body' ? 'packages' : `${type}s`;
      return `filename="${dir}/${name}.sql"`;
    },
  );
}
