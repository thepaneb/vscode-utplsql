import * as vscode from 'vscode';
import { readConfig, type UtConfig } from './config';
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
    return {
      conn1: await pool.getConnection(),
      conn2: await pool.getConnection(),
    };
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
}

export async function executeRunOracle(
  options: OracleRunOptions,
  token: vscode.CancellationToken,
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
  } = options;

  let oracledb: typeof import('oracledb');
  try {
    const mod = await import('oracledb');
    oracledb =
      ((mod as Record<string, unknown>).default as typeof import('oracledb')) ??
      (mod as typeof import('oracledb'));
  } catch {
    throw new Error(
      'oracledb não disponível. Instale com "npm install oracledb" ou use runnerMode "cli".',
    );
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
    if (coverage) {
      runners.push('ut_coverage_cobertura_reporter()');
    }

    const pathsList =
      pathArgs.length > 0 ? pathArgs.map((p) => `'${p.replace(/'/g, "''")}'`).join(',') : '';

    const plsql = `BEGIN ut_runner.run(
      a_paths => ut_varchar2_list(${pathsList}),
      a_reporters => ut_reporters(${runners.join(',')})
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

    while (true) {
      const done = await Promise.race([
        runnerPromise.then(() => true),
        cancelled.then(() => true),
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

    if (coverage) {
      if (covXml.trim()) {
        const mappedXml = mapDbPathsToFiles(covXml);
        applyCoverageFromXml(mappedXml, sourcePath, root, run, state, folders);
      } else {
        run.appendOutput(
          '\r\n[cobertura] relatório não gerado. Verifique o GRANT EXECUTE ON SYS.DBMS_PROFILER.\r\n',
        );
      }
    }

    run.appendOutput(
      `\r\n[info] Oracle runner ${runnerMs}ms | ${junitPart.length} chars JUnit\r\n`,
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
