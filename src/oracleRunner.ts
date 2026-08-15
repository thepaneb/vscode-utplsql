import * as vscode from 'vscode';
import { parseCobertura } from './cobertura';
import { readConfig, type UtConfig } from './config';
import { resolveSourceUri } from './coverage';
import { isUserFrame, parseJUnit, type StackFrame } from './junit';
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

async function discoverUtplsqlSchema(conn: {
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
    if ((result.rows?.length ?? 0) > 0) {
      const owner = (result.rows?.[0] as { TABLE_OWNER?: string }).TABLE_OWNER;
      if (owner) return `${owner}.`;
    }
  } catch {
    // ALL_SYNONYMS pode não estar acessível — sem prefixo
  }
  return '';
}

export async function executeRunOracle(
  connection: string,
  pathArgs: string[],
  coverage: boolean,
  sourcePath: string,
  root: string,
  run: vscode.TestRun,
  leafTests: vscode.TestItem[],
  state: TestStateManager,
  token: vscode.CancellationToken,
  onComplete?: (
    passed: number,
    failed: number,
    skipped: number,
    errored: number,
    durationMs: number,
  ) => void,
  folders?: readonly vscode.WorkspaceFolder[],
): Promise<void> {
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
      const r = countResultsFromCases(cases);
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

function mapDbPathsToFiles(covXml: string): string {
  return covXml.replace(
    /filename="(function|procedure|package body|package|view|trigger)\s+\w+\.(\w+)"/g,
    (_match, type: string, name: string) => {
      const dir = type === 'package body' ? 'packages' : `${type}s`;
      return `filename="${dir}/${name}.sql"`;
    },
  );
}

function resolveStackLocation(
  stackFrames: StackFrame[],
  state: TestStateManager,
): vscode.Location | undefined {
  const userFrame = stackFrames.find(isUserFrame);
  if (!userFrame || userFrame.line <= 0) return undefined;

  const objName = userFrame.objectName.toLowerCase();
  for (const item of state.cachedItems) {
    const meta = state.getMeta(item);
    if (!meta?.uri || meta.kind !== 'suite') continue;
    if (meta.packageName.toLowerCase() !== objName) continue;
    const line = Math.max(0, userFrame.line - 1);
    return new vscode.Location(meta.uri, new vscode.Position(line, 0));
  }
  return undefined;
}

export function applyResultsFromCases(
  cases: ReturnType<typeof parseJUnit>,
  leafTests: vscode.TestItem[],
  run: vscode.TestRun,
  state: TestStateManager,
): Map<string, { status: 'passed' | 'failed' | 'error' | 'skipped'; message?: string }> {
  const resultMap = new Map<
    string,
    { status: 'passed' | 'failed' | 'error' | 'skipped'; message?: string }
  >();

  const index = new Map<string, vscode.TestItem>();
  for (const t of leafTests) {
    const m = state.getMeta(t);
    if (m?.kind !== 'test') continue;
    const pkg = m.packageName.toLowerCase();
    index.set(`${pkg}|${m.procName.toLowerCase()}`, t);
    index.set(`${pkg}|${m.description.toLowerCase().trim()}`, t);
  }

  const matched = new Set<vscode.TestItem>();

  for (const c of cases) {
    const parts = c.classname.split(/[.:]/).filter(Boolean);
    const pkg = (parts.length ? parts[parts.length - 1] : c.classname).toLowerCase();
    const name = c.name.toLowerCase().trim();
    let item = index.get(`${pkg}|${name}`);
    if (!item) {
      for (const t of leafTests) {
        const m = state.getMeta(t);
        if (m?.kind !== 'test') continue;
        if (m.procName.toLowerCase() === name || m.description.toLowerCase().trim() === name) {
          item = t;
          break;
        }
      }
    }
    if (!item) continue;
    matched.add(item);
    resultMap.set(item.id, { status: c.status, message: c.message });

    switch (c.status) {
      case 'passed':
        run.passed(item, c.durationMs);
        break;
      case 'failed': {
        const msg = new vscode.TestMessage(c.message ?? 'Falhou');
        if (c.stackFrames) {
          const loc = resolveStackLocation(c.stackFrames, state);
          if (loc) msg.location = loc;
        }
        run.failed(item, msg, c.durationMs);
        break;
      }
      case 'error': {
        const msg = new vscode.TestMessage(c.message ?? 'Erro');
        if (c.stackFrames) {
          const loc = resolveStackLocation(c.stackFrames, state);
          if (loc) msg.location = loc;
        }
        run.errored(item, msg, c.durationMs);
        break;
      }
      case 'skipped':
        run.skipped(item);
        break;
    }
  }

  for (const t of leafTests) {
    if (!matched.has(t)) {
      run.skipped(t);
    }
  }

  return resultMap;
}

export function countResultsFromCases(cases: ReturnType<typeof parseJUnit>): {
  passed: number;
  failed: number;
  skipped: number;
  errored: number;
  totalMs: number;
} {
  let passed = 0;
  let failed = 0;
  let skipped = 0;
  let errored = 0;
  let totalMs = 0;
  for (const c of cases) {
    switch (c.status) {
      case 'passed':
        passed++;
        break;
      case 'failed':
        failed++;
        break;
      case 'skipped':
        skipped++;
        break;
      case 'error':
        errored++;
        break;
    }
    totalMs += c.durationMs ?? 0;
  }
  return { passed, failed, skipped, errored, totalMs };
}

export function applyCoverageFromXml(
  covXml: string,
  sourcePath: string,
  _root: string,
  run: vscode.TestRun,
  state: TestStateManager,
  folders?: readonly vscode.WorkspaceFolder[],
): void {
  state.clearCoverage();
  const files = parseCobertura(covXml);
  let mappedCount = 0;

  for (const f of files) {
    let uri: vscode.Uri | undefined;
    for (const folder of folders ?? []) {
      uri = resolveSourceUri(f.file, folder.uri.fsPath, sourcePath, folder.uri.fsPath);
      if (uri) break;
    }
    if (!uri) continue;
    const details: vscode.FileCoverageDetail[] = f.lines.map(
      (l) => new vscode.StatementCoverage(l.hits, new vscode.Position(Math.max(0, l.line - 1), 0)),
    );
    if (details.length === 0) continue;
    const fc = vscode.FileCoverage.fromDetails(uri, details);
    state.setCoverage(uri.toString(), details);
    run.addCoverage(fc);
    mappedCount++;
  }

  if (mappedCount === 0) {
    run.appendOutput(
      '\r\n[cobertura] nenhum arquivo mapeado. Ajuste "utplsql.sourcePath" para a pasta do código-fonte.\r\n',
    );
  }
}
