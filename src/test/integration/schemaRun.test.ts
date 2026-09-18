/// <reference types="mocha" />
import * as assert from 'node:assert';
import * as vscode from 'vscode';
import { installOutFormatIsolation } from './helpers';

// Integração do executeRun no modo schema + validação de reporters + cancelamento
// real. Gate: UTPLSQL_CONN no .env (mesma regra dos demais testes de integração).
//
// Cobre o bug em que selecionar um nó `Schema:`/`Package:` (ou Run All no modo
// schema) não expandia os filhos: o Oracle rodava tudo sem aplicar resultados.
// Objetos criados usam sufixo _SCHEMAIT e são removidos em `finally`.

function hasConnection(): boolean {
  return !!process.env.UTPLSQL_CONN;
}
const describeDB = hasConnection() ? describe : describe.skip;

function connParts(): { user: string; password: string; connectString: string } {
  const conn = process.env.UTPLSQL_CONN as string;
  const m = conn.match(/^([^/]+)\/([^@]+)@\/\/(.+)$/);
  assert.ok(m, 'UTPLSQL_CONN deve ser user/pass@//host:port/svc');
  return { user: m[1], password: m[2], connectString: m[3] };
}

async function openRaw(): Promise<import('oracledb').Connection> {
  const mod = await import('oracledb');
  const oracledb =
    ((mod as Record<string, unknown>).default as typeof import('oracledb')) ??
    (mod as typeof import('oracledb'));
  const { user, password, connectString } = connParts();
  return oracledb.getConnection({ user, password, connectString });
}

async function dropPackage(dbc: import('oracledb').Connection, name: string): Promise<void> {
  await dbc
    .execute(
      `BEGIN EXECUTE IMMEDIATE 'DROP PACKAGE ${name}'; EXCEPTION WHEN OTHERS THEN NULL; END;`,
      {},
      { autoCommit: true },
    )
    .catch(() => {});
}

async function rebuildAnnotations(dbc: import('oracledb').Connection): Promise<void> {
  const owner = connParts().user.toUpperCase();
  await dbc.execute(
    `BEGIN ut3.ut_runner.rebuild_annotation_cache(:owner, 'PACKAGE'); END;`,
    { owner },
    { autoCommit: true },
  );
}

/** Package de teste utPLSQL que apenas emite um marker (sempre passa). */
async function createPassingPackage(
  dbc: import('oracledb').Connection,
  name: string,
  marker: string,
): Promise<void> {
  await dropPackage(dbc, name);
  await dbc.execute(
    `CREATE OR REPLACE PACKAGE ${name} AS
       --%suite(schema-run IT)

       --%test(sempre passa)
       PROCEDURE ok;
     END ${name};`,
    {},
    { autoCommit: true },
  );
  await dbc.execute(
    `CREATE OR REPLACE PACKAGE BODY ${name} AS
       PROCEDURE ok IS
       BEGIN
         DBMS_OUTPUT.PUT_LINE('${marker}');
       END ok;
     END ${name};`,
    {},
    { autoCommit: true },
  );
  await rebuildAnnotations(dbc);
}

/** Package cujo teste faz busy-wait por ~8s (para cancelar no meio). */
async function createSlowPackage(dbc: import('oracledb').Connection, name: string): Promise<void> {
  await dropPackage(dbc, name);
  await dbc.execute(
    `CREATE OR REPLACE PACKAGE ${name} AS
       --%suite(slow IT)

       --%test(demora)
       PROCEDURE slow;
     END ${name};`,
    {},
    { autoCommit: true },
  );
  await dbc.execute(
    `CREATE OR REPLACE PACKAGE BODY ${name} AS
       PROCEDURE slow IS
         l_start TIMESTAMP := SYSTIMESTAMP;
       BEGIN
         LOOP
           EXIT WHEN SYSTIMESTAMP - l_start > INTERVAL '8' SECOND;
         END LOOP;
       END slow;
     END ${name};`,
    {},
    { autoCommit: true },
  );
  await rebuildAnnotations(dbc);
}

function makeTestRun(output: string[]) {
  return {
    enqueued: () => {},
    started: () => {},
    passed: () => {},
    failed: () => {},
    errored: () => {},
    skipped: () => {},
    appendOutput: (s: string) => void output.push(s),
    end: () => {},
    addCoverage: () => {},
  };
}

const fakeToken = {
  isCancellationRequested: false,
  onCancellationRequested: () => ({ dispose: () => {} }),
};

const SCHEMA_PKG = 'UTPLSQL_SCHEMARUN_SCHEMAIT';
const SLOW_PKG = 'UTPLSQL_SLOW_SCHEMAIT';

describeDB('executeRun schema-mode + reporters + cancelamento (banco real)', () => {
  installOutFormatIsolation();

  before(async () => {
    const ext = vscode.extensions.getExtension('paneb.vscode-utplsql');
    await ext?.activate();
  });

  it('run a partir de um nó Schema expande os filhos e aplica resultados', async function () {
    this.timeout(180_000);
    const dbc = await openRaw();
    const root = vscode.workspace.workspaceFolders?.[0]?.uri;
    assert.ok(root, 'workspace folder required');
    const user = connParts().user.toUpperCase();
    const schemaDir = vscode.Uri.joinPath(root, 'db', user);
    await vscode.workspace.fs.createDirectory(schemaDir);

    const cfg = vscode.workspace.getConfiguration('utplsql');
    const origOrg = cfg.inspect<string>('organization');
    const origPattern = cfg.inspect<string>('organization.schemaPattern');
    const { createRefresher } = require('../../testTree.js');
    const { TestStateManager } = require('../../state.js');
    const { executeRun } = require('../../runner.js');

    const controller = vscode.tests.createTestController('utplsql-it-schemarun', 'IT SchemaRun');
    const state = new TestStateManager();
    try {
      await createPassingPackage(dbc, SCHEMA_PKG, 'schema-run-marker');
      await cfg.update('organization', 'schema', vscode.ConfigurationTarget.Workspace);
      await cfg.update(
        'organization.schemaPattern',
        'db/{schema}/**',
        vscode.ConfigurationTarget.Workspace,
      );

      const refresh = createRefresher(controller, state);
      await refresh();

      const schemaItem = controller.items.get(`schema:${user}`);
      assert.ok(schemaItem, `nó schema:${user} deveria existir na árvore`);

      const request = new vscode.TestRunRequest([schemaItem]);
      const cts = new vscode.CancellationTokenSource();
      try {
        await executeRun(controller, request, cts.token, false, state);
      } finally {
        cts.dispose();
      }

      const results = state.getLastResults();
      assert.ok(results.size > 0, 'resultados deveriam ser aplicados a partir do nó Schema');
      const statuses = [...results.values()].map((r) => r.status);
      assert.ok(statuses.includes('passed'), `esperava passed, veio: ${statuses.join(',')}`);
      assert.ok(state.getLastRun(), 'lastRun deveria estar registrado');
    } finally {
      controller.dispose();
      await dropPackage(dbc, SCHEMA_PKG);
      await dbc.close().catch(() => {});
      await cfg.update(
        'organization',
        origOrg?.workspaceValue ?? undefined,
        vscode.ConfigurationTarget.Workspace,
      );
      await cfg.update(
        'organization.schemaPattern',
        origPattern?.workspaceValue ?? undefined,
        vscode.ConfigurationTarget.Workspace,
      );
      await vscode.workspace.fs.delete(vscode.Uri.joinPath(root, 'db'), { recursive: true });
    }
  });

  it('additionalReporters inexistente é ignorado sem abortar o run', async function () {
    this.timeout(120_000);
    const { executeRunOracle } = require('../../oracleRunner.js');
    const { TestStateManager } = require('../../state.js');
    const output: string[] = [];
    const state = new TestStateManager();
    await executeRunOracle(
      {
        connection: process.env.UTPLSQL_CONN as string,
        pathArgs: ['test_math'],
        coverage: false,
        sourcePath: 'install',
        root: vscode.workspace.workspaceFolders?.[0]?.uri.fsPath as string,
        run: makeTestRun(output) as never,
        leafTests: [{ id: 'it-leaf' }] as never,
        state: state as never,
        additionalReporters: ['UT_REPORTER_INEXISTENTE_XYZ'],
      },
      fakeToken as never,
    );
    assert.ok(
      output.join('\n').includes('UT_REPORTER_INEXISTENTE_XYZ'),
      'deveria avisar que o reporter adicional não existe',
    );
  });

  it('cancelamento interrompe um teste longo (busy-wait de 8s)', async function () {
    this.timeout(120_000);
    const dbc = await openRaw();
    const { executeRunOracle } = require('../../oracleRunner.js');
    const { TestStateManager } = require('../../state.js');
    const output: string[] = [];
    const cts = new vscode.CancellationTokenSource();
    try {
      await createSlowPackage(dbc, SLOW_PKG);
      const started = Date.now();
      const p = executeRunOracle(
        {
          connection: process.env.UTPLSQL_CONN as string,
          pathArgs: [SLOW_PKG.toLowerCase()],
          coverage: false,
          sourcePath: 'install',
          root: vscode.workspace.workspaceFolders?.[0]?.uri.fsPath as string,
          run: makeTestRun(output) as never,
          leafTests: [{ id: 'it-leaf' }] as never,
          state: new TestStateManager() as never,
        },
        cts.token,
      );
      setTimeout(() => cts.cancel(), 500);
      // Se o break não abortasse, o busy-wait de 8s terminaria antes.
      await Promise.race([
        p.catch(() => undefined),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('run não foi cancelado em 5s')), 5000),
        ),
      ]);
      assert.ok(Date.now() - started < 5000, 'o run deveria terminar bem antes dos 8s');
    } finally {
      cts.dispose();
      await dropPackage(dbc, SLOW_PKG);
      await dbc.close().catch(() => {});
    }
  });
});
