import * as fs from 'node:fs';
import * as path from 'node:path';
import * as vscode from 'vscode';
import { getExtensionLocale, readConfig, type UtConfig } from './config';
import {
  type CoverageOutputKind,
  classifyCoverageOutput,
  coverageHtmlReportPath,
  prepareCoverageHtmlReport,
  writeCoverageHtmlReport,
} from './coverage';
import { t } from './i18n';
import { parseJUnit } from './junit';
import { logger } from './logger';
import { ensureOracleClient } from './oracleClient';
import { sanitizeSchemaPrefix } from './oracleIdentifiers';
import { pollOutputStream } from './oraclePoll';
import {
  buildCoverageScope,
  buildRandomOrderParams,
  buildReporterList,
  buildRunCall,
} from './oracleRunCall';
import { maskConnection, redactConnection } from './redact';
import { applyCoverageFromXml, applyResultsFromCases, countResults } from './results';
import type { TestStateManager } from './state';
import { looksLikeTnsAlias, resolveTnsAlias, TNSNAMES_FILENAME } from './tnsnames';

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
    // Nunca ecoar a connection crua: ela contém a senha (CWE-532).
    throw new Error(
      t(getExtensionLocale(), 'oracleRunner.badConnFormat', { conn: maskConnection(connStr) }),
    );
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

/**
 * Resolve o `connectString` para o driver (PRD-82 RF3): se for um alias TNS e
 * houver `tnsAdminPath` resolvido, devolve o descriptor lido do `tnsnames.ora`;
 * caso contrário devolve o valor original (Easy Connect/TNS opaco inalterado).
 * Nunca lança: `tnsnames.ora` ausente/ilegível mantém o valor original.
 */
export function resolveConnectString(connectString: string, tnsAdminPath: string): string {
  if (!tnsAdminPath || !looksLikeTnsAlias(connectString)) return connectString;
  const file = path.join(tnsAdminPath, TNSNAMES_FILENAME);
  try {
    const content = fs.readFileSync(file, 'utf8');
    return resolveTnsAlias(content, connectString) ?? connectString;
  } catch (e) {
    logger.debug('resolveConnectString: tnsnames.ora inacessível', { file, error: String(e) });
    return connectString;
  }
}

export async function ensurePool(
  oracledb: typeof import('oracledb'),
  connection: string,
  cfg: UtConfig,
): Promise<OraclePool> {
  const key = `${connection}|${cfg.oraclePoolMin}|${cfg.oraclePoolMax}|${cfg.oraclePoolIncrement}|${cfg.oraclePoolPingInterval}|${cfg.tnsAdminPath}|${cfg.walletLocation}`;
  const client = ensureOracleClient(
    oracledb,
    cfg.oracleClientMode,
    cfg.oracleClientLibDir,
    cfg.oracleClientConfigDir,
  );
  if (client.error) {
    logger.warn('ensurePool: cliente Oracle thick não inicializou', {
      error: redactConnection(String(client.error ?? ''), connection),
    });
  }
  if (currentPool?.key === key) return currentPool.pool;
  await closeOraclePool();
  const parsed = parseConnString(connection);
  const pool = await oracledb.createPool({
    user: parsed.user,
    password: parsed.password,
    connectString: resolveConnectString(parsed.connectionString, cfg.tnsAdminPath),
    poolMin: cfg.oraclePoolMin,
    poolMax: cfg.oraclePoolMax,
    poolIncrement: cfg.oraclePoolIncrement,
    poolPingInterval: cfg.oraclePoolPingInterval,
    stmtCacheSize: 30,
    ...(cfg.walletLocation ? { walletLocation: cfg.walletLocation } : {}),
    ...(cfg.walletPassword ? { walletPassword: cfg.walletPassword } : {}),
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
    logger.debug('withOracleConnection: falha ao obter conexão', {
      error: redactConnection(String(e), connection),
    });
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
      // Defesa em profundidade: o prefixo só chega ao SQL se for um
      // identificador Oracle válido (PRD-110).
      if (owner) return sanitizeSchemaPrefix(`${owner}.`);
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
    logger.debug('findInvalidUt3Objects: falha ao obter conexão', {
      error: redactConnection(String(e), connection),
    });
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
      error: redactConnection(String(e), connection),
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

/**
 * Reconstrói o cache de anotações do utPLSQL no banco (PRD-77) chamando
 * `ut_runner.rebuild_annotation_cache(<owner>)`, com o usuário da conexão como
 * owner. Lança em caso de falha de conexão/execução (o comando trata).
 */
export async function rebuildAnnotationCache(
  oracledb: typeof import('oracledb'),
  connection: string,
  cfg: UtConfig,
): Promise<void> {
  const owner = parseConnString(connection).user.toUpperCase();
  const done = await withOracleConnection(oracledb, connection, cfg, async (conn) => {
    await conn.execute(
      `BEGIN ut_runner.rebuild_annotation_cache(:owner); END;`,
      { owner: { dir: oracledb.BIND_IN, type: oracledb.STRING, val: owner } },
      { autoCommit: true },
    );
    return true;
  });
  if (!done) {
    throw new Error(t(getExtensionLocale(), 'ext.noConnection'));
  }
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
  /** Se true, gera o relatório HTML de cobertura (PRD-108). */
  coverageHtmlReport?: boolean;
  /** Root do workspace da suíte executada (destino do `test-results/`). */
  reportRoot?: string;
  /** Callback chamado após gravar o HTML (o runner notifica depois do run.end). */
  onCoverageHtmlReport?: (filePath: string) => void;
  /** Caminho base do código-fonte para mapeamento de cobertura */
  sourcePath: string;
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
  /** Callback opcional com o resultado da cobertura (true = gerada). */
  onCoverageResult?: (generated: boolean) => void;
  /** Workspace folders para resolução de sourceUri */
  folders?: readonly vscode.WorkspaceFolder[];
  /** Extra reporters adicionados via config */
  additionalReporters?: string[];
  /** Expressão de tags do utPLSQL (ex.: `fast & !integration`); vazio = todas */
  tags?: string;
  /** Se true, executa os testes em ordem aleatória (`a_random_test_order`) */
  randomOrder?: boolean;
  /** Seed da ordem aleatória (0 = sorteada pelo banco) */
  randomOrderSeed?: number;
  /** Owner do schema para coverage (override) */
  coverageOwner?: string;
  /** Schemas de cobertura (sobrepõe o owner; vazio = automático) */
  coverageSchemes?: string[];
  /** Objetos a incluir na cobertura (formato OWNER.NAME) */
  coverageIncludeObjects?: string[];
  /** Objetos a excluir da cobertura (formato OWNER.NAME) */
  coverageExcludeObjects?: string[];
  /** Regex de schema a incluir na cobertura */
  coverageIncludeSchemaExpr?: string;
  /** Regex de objeto a incluir na cobertura */
  coverageIncludeObjectExpr?: string;
  /** Regex de schema a excluir da cobertura */
  coverageExcludeSchemaExpr?: string;
  /** Regex de objeto a excluir da cobertura */
  coverageExcludeObjectExpr?: string;
  /** Se true, captura DBMS_OUTPUT */
  dbmsOutput?: boolean;
  /** Timeout em minutos (0 = sem timeout) */
  timeoutMinutes?: number;
  /**
   * Export com reporter arbitrário (PRD-76): quando presente, o run usa apenas
   * esse reporter, captura a saída textual e a devolve (sem aplicar resultados
   * de teste nem cobertura).
   */
  exportReporter?: { name: string; charset?: string; colorConsole?: boolean };
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

/**
 * Lista os reporters do banco numa conexão própria (best-effort). Vazio quando
 * não há oracledb/conexão disponível.
 */
export async function listReportersForConnection(
  connection: string,
  cfg: UtConfig,
): Promise<string[]> {
  const oracledb = await loadOracledb();
  if (!oracledb) return [];
  const result = await withOracleConnection(oracledb, connection, cfg, (conn) =>
    listReportersOracle(conn),
  );
  return result ?? [];
}

interface ReporterPreparation {
  runners: string[];
  exportBinds: Record<string, import('oracledb').BindParameter>;
  coverageEnabled: boolean;
  htmlEnabled: boolean;
}

/** Resolve os reporters do banco e monta a lista do `a_reporters`. */
async function prepareReporters(options: {
  conn1: import('oracledb').Connection;
  exporting: boolean;
  exportReporter?: { name: string; charset?: string; colorConsole?: boolean };
  coverage: boolean;
  coverageHtmlReport?: boolean;
  additionalReporters?: string[];
  state: TestStateManager;
  run: vscode.TestRun;
  oracledb: typeof import('oracledb');
}): Promise<ReporterPreparation> {
  let coverageEnabled = !options.exporting && options.coverage;
  let htmlEnabled = false;
  let runners: string[] = [];
  let exportBinds: Record<string, import('oracledb').BindParameter> = {};

  if (options.exporting && options.exportReporter) {
    // Export (PRD-76): só o reporter escolhido; sem JUnit/cobertura adicionais.
    const normalized = options.exportReporter.name.toLowerCase().replace(/\(\)$/, '');
    const known = await listReportersOracle(options.conn1);
    const valid =
      /^[a-z0-9_]+$/.test(normalized) &&
      (known.length === 0 || known.some((k) => k.toLowerCase() === normalized));
    if (!valid) {
      throw new Error(
        t(getExtensionLocale(), 'runner.reporterUnknown', { name: options.exportReporter.name }),
      );
    }
    const list = buildReporterList({
      exporting: true,
      exportReporter: options.exportReporter,
      coverageEnabled: false,
      htmlEnabled: false,
      knownReporters: known,
      oracledb: options.oracledb,
    });
    runners = list.runners;
    exportBinds = list.binds;
    return { runners, exportBinds, coverageEnabled: false, htmlEnabled: false };
  }

  if (coverageEnabled) {
    const hasReporter = await checkReporterExists(options.conn1, 'UT_COVERAGE_COBERTURA_REPORTER');
    if (!hasReporter) {
      coverageEnabled = false;
      options.run.appendOutput(`\r\n${t(getExtensionLocale(), 'runner.reporterMissing')}\r\n`);
    }
  }

  // Relatório HTML (PRD-108): só entra com cobertura ligada e o setting on.
  htmlEnabled = coverageEnabled && !!options.coverageHtmlReport;
  if (htmlEnabled) {
    const hasHtml = await checkReporterExists(options.conn1, 'UT_COVERAGE_HTML_REPORTER');
    if (!hasHtml) {
      htmlEnabled = false;
      options.run.appendOutput(`\r\n${t(getExtensionLocale(), 'runner.htmlReporterMissing')}\r\n`);
    }
  }

  // Reporter adicional volátil da sessão (PRD-68 RF2): consumo único.
  const sessionReporter = options.state.consumeExtraReporter?.();
  if (sessionReporter) {
    options.run.appendOutput(
      `\r\n${t(getExtensionLocale(), 'runner.extraReporter', { name: sessionReporter })}\r\n`,
    );
  }

  // Validar reporter adicional evita que um nome inexistente aborte todo o
  // `ut_runner.run` com ORA. Lista indisponível (best-effort) → não bloqueia.
  const extraReporters = [...(options.additionalReporters ?? [])];
  if (sessionReporter) extraReporters.push(sessionReporter);
  const knownReporters = extraReporters.length > 0 ? await listReportersOracle(options.conn1) : [];

  const list = buildReporterList({
    exporting: false,
    coverageEnabled,
    htmlEnabled,
    additionalReporters: options.additionalReporters,
    sessionReporter,
    knownReporters,
    oracledb: options.oracledb,
  });
  runners = list.runners;
  exportBinds = list.binds;
  for (const name of list.invalid) {
    logger.warn('reporter adicional ignorado (nome inválido)', { reporter: name });
  }
  for (const name of list.unknown) {
    logger.warn('reporter adicional inexistente ignorado', { reporter: name });
    options.run.appendOutput(
      `\r\n${t(getExtensionLocale(), 'runner.reporterUnknown', { name })}\r\n`,
    );
  }

  return { runners, exportBinds, coverageEnabled, htmlEnabled };
}

interface RunAndPollResult {
  exportText: string;
  runnerMs: number;
}

/** Executa o `ut_runner.run`, faz o poll do buffer e devolve a saída de export. */
async function runAndPoll(options: {
  conn1: import('oracledb').Connection;
  conn2: import('oracledb').Connection;
  utSchema: string;
  plsql: string;
  binds: Record<string, import('oracledb').BindParameter>;
  token: vscode.CancellationToken;
  timeoutMinutes?: number;
  dbmsOutput?: boolean;
  exporting: boolean;
  run: vscode.TestRun;
  outputs: Map<string, { kind: 'unknown' | CoverageOutputKind; text: string }>;
  connection: string;
  oracledb: typeof import('oracledb');
}): Promise<RunAndPollResult> {
  if (options.dbmsOutput) {
    try {
      // DBMS_OUTPUT é por sessão: habilita em conn1, que executa os testes.
      await options.conn1.execute(`BEGIN DBMS_OUTPUT.ENABLE(NULL); END;`);
    } catch (e) {
      logger.debug('executeRunOracle: DBMS_OUTPUT.ENABLE falhou', {
        error: redactConnection(String(e), options.connection),
      });
    }
  }

  const runnerStart = Date.now();
  const runnerPromise = options.conn1.execute(options.plsql, options.binds, { autoCommit: true });
  const outputKey = (value: unknown): string =>
    Buffer.isBuffer(value) ? value.toString('hex') : String(value ?? 'default');

  const cancelRun = () => {
    options.conn1.break().catch(() => {});
    options.conn2.break().catch(() => {});
  };
  const wakeRun = Promise.withResolvers<void>();
  const cancelSub = options.token.onCancellationRequested(() => {
    cancelRun();
    wakeRun.resolve();
  });
  const timeoutMs = (options.timeoutMinutes ?? 0) * 60 * 1000;
  const timeoutTimer =
    timeoutMs > 0
      ? setTimeout(() => {
          cancelRun();
          wakeRun.resolve();
        }, timeoutMs)
      : undefined;

  let exportText = '';
  try {
    await pollOutputStream({
      conn: options.conn2,
      utSchema: options.utSchema,
      done: Promise.race([runnerPromise.then(() => true), wakeRun.promise.then(() => true)]),
      onText: (text, outputId) => {
        if (options.exporting) {
          exportText += `${text}\n`;
          options.run.appendOutput(`${text}\r\n`);
          return;
        }

        const key = outputKey(outputId);
        let group = options.outputs.get(key);
        if (!group) {
          group = { kind: 'unknown', text: '' };
          options.outputs.set(key, group);
        }
        if (group.kind === 'unknown') {
          group.kind = classifyCoverageOutput(text);
        }
        if (group.kind === 'console') {
          options.run.appendOutput(`${text}\r\n`);
        } else {
          group.text += `${text}\n`;
        }
      },
      onError: (e) => {
        // polling pode falhar se conn1 ainda não escreveu — ignorar
        logger.debug('executeRunOracle: poll do buffer falhou', {
          error: redactConnection(String(e), options.connection),
        });
      },
    });
  } finally {
    cancelSub.dispose();
    if (timeoutTimer) clearTimeout(timeoutTimer);
  }

  return { exportText, runnerMs: Date.now() - runnerStart };
}

export async function executeRunOracle(
  options: OracleRunOptions,
  token: vscode.CancellationToken,
  loadOracledbMod: () => Promise<LoadedOracledb | undefined> = loadOracledb,
): Promise<string | undefined> {
  const {
    connection,
    pathArgs,
    coverage,
    coverageHtmlReport,
    reportRoot,
    onCoverageHtmlReport,
    sourcePath,
    run,
    leafTests,
    state,
    onComplete,
    onCoverageResult,
    folders,
    additionalReporters,
    tags,
    randomOrder,
    randomOrderSeed,
    coverageOwner,
    coverageSchemes: coverageSchemesCfg,
    coverageIncludeObjects,
    coverageExcludeObjects,
    coverageIncludeSchemaExpr,
    coverageIncludeObjectExpr,
    coverageExcludeSchemaExpr,
    coverageExcludeObjectExpr,
    dbmsOutput,
    timeoutMinutes,
    exportReporter,
  } = options;
  const exporting = !!exportReporter;

  const oracledb = await loadOracledbMod();
  if (!oracledb) {
    throw new Error(t(getExtensionLocale(), 'common.oracledbMissing'));
  }

  const cfg = readConfig();
  const { conn1, conn2 } = await acquireRunnerConnections(oracledb, connection, cfg);

  try {
    const htmlReportTarget =
      coverage && coverageHtmlReport ? coverageHtmlReportPath(reportRoot) : undefined;
    if (htmlReportTarget) {
      try {
        await prepareCoverageHtmlReport(htmlReportTarget);
      } catch (e) {
        logger.debug('executeRunOracle: falha ao preparar o HTML de cobertura', {
          error: redactConnection(String(e), connection),
        });
      }
    }

    const utSchema = sanitizeSchemaPrefix(await discoverUtplsqlSchema(conn1));

    await conn1.execute(`DELETE FROM ${utSchema}UT_OUTPUT_BUFFER_TMP`, {}, { autoCommit: true });
    await conn1.execute(
      `DELETE FROM ${utSchema}UT_OUTPUT_BUFFER_INFO_TMP`,
      {},
      { autoCommit: true },
    );

    const { runners, exportBinds, coverageEnabled, htmlEnabled } = await prepareReporters({
      conn1,
      exporting,
      exportReporter,
      coverage,
      coverageHtmlReport,
      additionalReporters,
      state,
      run,
      oracledb,
    });

    const owner = (coverageOwner ?? '').trim() || parseConnString(connection).user.toUpperCase();

    // Binds tipados (PRD-69): nenhum valor de usuário é concatenado no PL/SQL.
    // `UT_VARCHAR2_LIST` é o tipo da coleção do utPLSQL; o synonym sem prefixo
    // resolve tanto em install próprio quanto shared. Listas vazias viram
    // `null` (utPLSQL roda tudo) — evita bind de coleção vazia ambíguo.
    //
    // Sem `a_source_file_mappings`: o reporter Cobertura então usa
    // `filename="<tipo> <schema>.<objeto>"`, que `mapDbPathsToFiles` converte
    // para caminhos locais (`packages/OBJ.sql`, etc.). Passar o diretório
    // `sourcePath` como `a_file_paths` (diretório, não arquivos) zerava a
    // cobertura — ver PRD-64 e testes de `mapDbPathsToFiles`.
    const scope = buildCoverageScope(oracledb, {
      enabled: coverageEnabled,
      owner,
      schemes: coverageSchemesCfg,
      includeObjects: coverageIncludeObjects,
      excludeObjects: coverageExcludeObjects,
      includeSchemaExpr: coverageIncludeSchemaExpr,
      includeObjectExpr: coverageIncludeObjectExpr,
      excludeSchemaExpr: coverageExcludeSchemaExpr,
      excludeObjectExpr: coverageExcludeObjectExpr,
    });
    const random = buildRandomOrderParams(oracledb, { randomOrder, randomOrderSeed });
    if (randomOrder) {
      run.appendOutput(
        `\r\n${t(getExtensionLocale(), 'runner.randomOrderSeed', { seed: random.seed })}\r\n`,
      );
    }
    const call = buildRunCall(oracledb, {
      pathArgs,
      runners,
      schemesArg: scope.schemesArg,
      scopeParams: scope.scopeParams,
      randomOrderParams: random.params,
      tags,
      binds: { ...exportBinds, ...scope.binds, ...random.binds },
    });
    const plsql = call.plsql;
    const binds = call.binds;

    // Cada reporter do utPLSQL escreve em um `output_id` próprio. Agrupar por
    // ele evita que o HTML de cobertura contamine o XML de JUnit/Cobertura e
    // dispensa o estado de CDATA (todas as linhas do grupo XML vão para o XML).
    const outputs = new Map<string, { kind: 'unknown' | CoverageOutputKind; text: string }>();
    const { exportText, runnerMs } = await runAndPoll({
      conn1,
      conn2,
      utSchema,
      plsql,
      binds,
      token,
      timeoutMinutes,
      dbmsOutput,
      exporting,
      run,
      outputs,
      connection,
      oracledb,
    });

    if (dbmsOutput) await drainDbmsOutput(conn1, run, oracledb, connection);

    // Export (PRD-76): devolve a saída do reporter sem aplicar resultados/cobertura.
    if (exporting) return exportText;

    await finalizeRun({
      outputs,
      runnerMs,
      coverageEnabled,
      coverageRequested: coverage,
      htmlEnabled,
      htmlReportTarget,
      onCoverageHtmlReport,
      onCoverageResult,
      onComplete,
      run,
      leafTests,
      state,
      folders,
      sourcePath,
      token,
      connection,
    });
  } finally {
    await conn1.close().catch(() => {});
    await conn2.close().catch(() => {});
  }
}

/** Drena o DBMS_OUTPUT da sessão que executou os testes (conn1). */
async function drainDbmsOutput(
  conn1: import('oracledb').Connection,
  run: vscode.TestRun,
  oracledb: typeof import('oracledb'),
  connection: string,
): Promise<void> {
  try {
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
    logger.debug('executeRunOracle: DBMS_OUTPUT indisponível', {
      error: redactConnection(String(e), connection),
    });
  }
}

interface FinalizeRunOptions {
  outputs: Map<string, { kind: 'unknown' | CoverageOutputKind; text: string }>;
  runnerMs: number;
  coverageEnabled: boolean;
  coverageRequested: boolean;
  htmlEnabled: boolean;
  htmlReportTarget?: string;
  onCoverageHtmlReport?: (filePath: string) => void;
  onCoverageResult?: (generated: boolean) => void;
  onComplete?: (
    passed: number,
    failed: number,
    skipped: number,
    errored: number,
    durationMs: number,
  ) => void;
  run: vscode.TestRun;
  leafTests: vscode.TestItem[];
  state: TestStateManager;
  folders?: readonly vscode.WorkspaceFolder[];
  sourcePath: string;
  token: vscode.CancellationToken;
  connection: string;
}

/** Parseia o JUnit/Cobertura e aplica resultados/cobertura (PRD-111 RF1). */
async function finalizeRun(options: FinalizeRunOptions): Promise<void> {
  const xmlBuffer = [...options.outputs.values()]
    .filter((group) => group.kind === 'xml')
    .map((group) => group.text)
    .join('');
  const htmlText = [...options.outputs.values()]
    .filter((group) => group.kind === 'html')
    .map((group) => group.text)
    .join('');

  const covStart = xmlBuffer.indexOf('<coverage');
  const junitPart = covStart > 0 ? xmlBuffer.substring(0, covStart) : xmlBuffer;
  const covXml = covStart > 0 ? xmlBuffer.substring(covStart) : '';

  const cases = parseJUnit(junitPart);
  const resultMap = applyResultsFromCases(cases, options.leafTests, options.run, options.state);
  options.state.setLastResults(resultMap);
  options.state.setLastFailedItems(
    options.leafTests.filter((t) => {
      const r = resultMap.get(t.id);
      return r?.status === 'failed' || r?.status === 'error';
    }),
  );
  // Snapshot do último resultado no workspaceState (PRD-56 RF2).
  options.state.persist();
  void vscode.commands.executeCommand(
    'setContext',
    'utplsql:hasFailures',
    options.state.getLastFailedItems().length > 0,
  );

  if (options.onComplete) {
    const r = countResults(cases);
    options.onComplete(r.passed, r.failed, r.skipped, r.errored, r.totalMs);
  }

  if (options.coverageEnabled) {
    const generated = covXml.trim().length > 0;
    if (generated) {
      const mappedXml = mapDbPathsToFiles(covXml);
      applyCoverageFromXml(
        mappedXml,
        options.sourcePath,
        options.run,
        options.state,
        options.folders,
      );
    } else {
      options.run.appendOutput(
        `\r\n${t(getExtensionLocale(), 'oracleRunner.coverNotGenerated')}\r\n`,
      );
    }
    if (!options.token.isCancellationRequested) options.onCoverageResult?.(generated);
  } else if (options.coverageRequested && !options.token.isCancellationRequested) {
    // Cobertura pedida, mas o reporter não existe/foi desabilitado: também
    // sinaliza para o diagnóstico de setup.
    options.onCoverageResult?.(false);
  }

  // HTML (PRD-108): grava só no fim, com o run não cancelado; o runner só
  // notifica depois do `run.end()` (fire-and-forget).
  if (
    options.htmlEnabled &&
    options.htmlReportTarget &&
    htmlText.trim() &&
    !options.token.isCancellationRequested
  ) {
    try {
      await writeCoverageHtmlReport(htmlText, options.htmlReportTarget);
      options.onCoverageHtmlReport?.(options.htmlReportTarget);
    } catch (e) {
      const redacted = redactConnection(String(e), options.connection);
      logger.warn('executeRunOracle: falha ao gravar o HTML de cobertura', {
        error: redacted,
      });
      options.run.appendOutput(`\r\n${t(getExtensionLocale(), 'common.error')}: ${redacted}\r\n`);
    }
  }

  options.run.appendOutput(
    `\r\n${t(getExtensionLocale(), 'runner.oracleInfo', { ms: options.runnerMs, chars: junitPart.length })}\r\n`,
  );
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
