/// <reference types="mocha" />
import * as assert from 'node:assert';
import * as vscode from 'vscode';
import { installOutFormatIsolation } from './helpers';

// Integração da release 0.14.0 contra banco real (segue o padrão de
// v012-features/v013-features). Cobre:
//   - PRD-76: export com reporter arbitrário (texto e XML).
//   - PRD-80: fonte virtual do banco (`utplsql-source:`).
//   - PRD-75: árvore lazy (refresh só cria schema; resolução sob demanda).
// Gate: UTPLSQL_CONN no .env. Objetos criados usam sufixo _V014IT e são
// removidos no `finally`.

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
    `BEGIN ut3.ut_runner.rebuild_annotation_cache(a_object_owner => :owner); END;`,
    { owner },
    { autoCommit: true },
  );
}

async function createPassingPackage(
  dbc: import('oracledb').Connection,
  name: string,
  suiteLabel: string,
): Promise<void> {
  await dropPackage(dbc, name);
  await dbc.execute(
    `CREATE OR REPLACE PACKAGE ${name} AS
       --%suite(${suiteLabel})
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
         NULL;
       END ok;
     END ${name};`,
    {},
    { autoCommit: true },
  );
  await rebuildAnnotations(dbc);
}

/** Cria um PROCEDURE standalone (objeto fora de package) para o provider virtual. */
async function createStandaloneProc(
  dbc: import('oracledb').Connection,
  name: string,
): Promise<void> {
  await dbc
    .execute(
      `BEGIN EXECUTE IMMEDIATE 'DROP PROCEDURE ${name}'; EXCEPTION WHEN OTHERS THEN NULL; END;`,
      {},
      { autoCommit: true },
    )
    .catch(() => {});
  await dbc.execute(
    `CREATE OR REPLACE PROCEDURE ${name} AS
     BEGIN
       NULL;
     END ${name};`,
    {},
    { autoCommit: true },
  );
}

async function dropProcedure(dbc: import('oracledb').Connection, name: string): Promise<void> {
  await dbc
    .execute(
      `BEGIN EXECUTE IMMEDIATE 'DROP PROCEDURE ${name}'; EXCEPTION WHEN OTHERS THEN NULL; END;`,
      {},
      { autoCommit: true },
    )
    .catch(() => {});
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

const VSRC_PKG = 'UTPLSQL_V014_VSRCIT';
const LAZY_PKG = 'UTPLSQL_V014_LAZYIT';

describeDB('v0.14.0 — export, fonte virtual e árvore lazy (banco real)', () => {
  installOutFormatIsolation();

  before(async () => {
    const ext = vscode.extensions.getExtension('paneb.vscode-utplsql');
    await ext?.activate();
  });

  // ── PRD-76 — export com reporter arbitrário ─────────────────────────

  it('PRD-76: export com ut_documentation_reporter devolve texto do run', async function () {
    this.timeout(180_000);
    const { executeRunOracle } = require('../../oracleRunner.js');
    const { TestStateManager } = require('../../state.js');
    const output: string[] = [];
    const text = (await executeRunOracle(
      {
        connection: process.env.UTPLSQL_CONN as string,
        pathArgs: ['test_math'],
        coverage: false,
        sourcePath: 'install',
        root: vscode.workspace.workspaceFolders?.[0]?.uri.fsPath as string,
        run: makeTestRun(output) as never,
        leafTests: [{ id: 'it-leaf' }] as never,
        state: new TestStateManager() as never,
        exportReporter: { name: 'ut_documentation_reporter' },
      },
      fakeToken as never,
    )) as string | undefined;

    assert.ok(typeof text === 'string' && text.length > 0, 'export deveria devolver texto');
    assert.ok(!/<testsuite/.test(text), 'documentation reporter não deveria emitir XML');
  });

  it('PRD-76: export com ut_junit_reporter devolve XML parseável', async function () {
    this.timeout(180_000);
    const { executeRunOracle } = require('../../oracleRunner.js');
    const { TestStateManager } = require('../../state.js');
    const output: string[] = [];
    const xml = (await executeRunOracle(
      {
        connection: process.env.UTPLSQL_CONN as string,
        pathArgs: ['test_math'],
        coverage: false,
        sourcePath: 'install',
        root: vscode.workspace.workspaceFolders?.[0]?.uri.fsPath as string,
        run: makeTestRun(output) as never,
        leafTests: [{ id: 'it-leaf' }] as never,
        state: new TestStateManager() as never,
        exportReporter: { name: 'ut_junit_reporter' },
      },
      fakeToken as never,
    )) as string | undefined;

    assert.ok(typeof xml === 'string', 'export deveria devolver string');
    assert.ok(/<testsuite/.test(xml), `XML JUnit inesperado: ${xml.slice(0, 200)}`);
  });

  it('PRD-76: export com reporter inexistente aborta o export', async function () {
    this.timeout(120_000);
    const { executeRunOracle } = require('../../oracleRunner.js');
    const { TestStateManager } = require('../../state.js');
    const output: string[] = [];
    await assert.rejects(
      executeRunOracle(
        {
          connection: process.env.UTPLSQL_CONN as string,
          pathArgs: ['test_math'],
          coverage: false,
          sourcePath: 'install',
          root: vscode.workspace.workspaceFolders?.[0]?.uri.fsPath as string,
          run: makeTestRun(output) as never,
          leafTests: [{ id: 'it-leaf' }] as never,
          state: new TestStateManager() as never,
          exportReporter: { name: 'ut_v014_inexistente_xyz' },
        },
        fakeToken as never,
      ),
    );
  });

  // ── PRD-80 — fonte virtual do banco ─────────────────────────────────

  it('PRD-80: fetchDbObjectSource serve ALL_SOURCE por tipo', async function () {
    this.timeout(180_000);
    const dbc = await openRaw();
    const { fetchDbObjectSource } = require('../../dbSourceProvider.js');
    const user = connParts().user.toUpperCase();
    try {
      await createPassingPackage(dbc, VSRC_PKG, 'v014 vsrc IT');

      const body = (await fetchDbObjectSource(
        vscode.Uri.parse(`utplsql-source:/${user}/${VSRC_PKG}.pkb`),
      )) as string;
      assert.ok(body.length > 0, 'deveria ler o corpo do package');
      assert.ok(/PACKAGE BODY/i.test(body), `esperava PACKAGE BODY: ${body.slice(0, 120)}`);

      const spec = (await fetchDbObjectSource(
        vscode.Uri.parse(`utplsql-source:/${user}/${VSRC_PKG}.pks`),
      )) as string;
      assert.ok(spec.length > 0, 'deveria ler a spec do package');
      assert.ok(/PACKAGE\s/i.test(spec), `esperava PACKAGE: ${spec.slice(0, 120)}`);

      // Sem schema → owner default = usuário da conexão.
      const noSchema = (await fetchDbObjectSource(
        vscode.Uri.parse(`utplsql-source:/${VSRC_PKG}.pkb`),
      )) as string;
      assert.ok(noSchema.length > 0, 'sem schema deveria usar o usuário da conexão');

      const missing = (await fetchDbObjectSource(
        vscode.Uri.parse(`utplsql-source:/${user}/UTPLSQL_NO_SUCH_V014.pkb`),
      )) as string;
      assert.strictEqual(missing, '', 'objeto inexistente deveria devolver vazio');
    } finally {
      await dropPackage(dbc, VSRC_PKG);
      await dbc.close().catch(() => {});
    }
  });

  it('PRD-80: fonte virtual serve objeto standalone e o scheme legado', async function () {
    this.timeout(180_000);
    const dbc = await openRaw();
    const { fetchDbObjectSource, fetchDbSource } = require('../../dbSourceProvider.js');
    const user = connParts().user.toUpperCase();
    const proc = 'UTPLSQL_V014_PROCIT';
    const legacyPkg = 'UTPLSQL_V014_LEGACYIT';
    try {
      await createStandaloneProc(dbc, proc);
      const src = (await fetchDbObjectSource(
        vscode.Uri.parse(`utplsql-source:/${user}/${proc}.prc`),
      )) as string;
      assert.ok(/PROCEDURE/i.test(src), `esperava PROCEDURE: ${src.slice(0, 120)}`);

      // Scheme legado `utplsql-db:` resolve a spec do package (PRD-74).
      await createPassingPackage(dbc, legacyPkg, 'v014 legacy IT');
      const legacy = (await fetchDbSource(
        vscode.Uri.parse(`utplsql-db:/${user}/${legacyPkg}.pks`),
      )) as string;
      assert.ok(/PACKAGE\s/i.test(legacy), `esperava PACKAGE: ${legacy.slice(0, 120)}`);
    } finally {
      await dropProcedure(dbc, proc);
      await dropPackage(dbc, legacyPkg);
      await dbc.close().catch(() => {});
    }
  });

  // ── PRD-75 — árvore lazy ────────────────────────────────────────────

  it('PRD-75: refresh materializa só o schema; collectAllItems resolve', async function () {
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
    const { createRefresher, collectAllItems } = require('../../testTree.js');
    const { TestStateManager } = require('../../state.js');
    const controller = vscode.tests.createTestController('utplsql-it-v014-lazy', 'IT v014 Lazy');
    const state = new TestStateManager();
    try {
      await createPassingPackage(dbc, LAZY_PKG, 'v014 lazy IT');
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
      // Lazy: o refresh não materializa suite nenhuma.
      assert.strictEqual(
        state.getSuiteItem(`suite:${LAZY_PKG.toLowerCase()}`),
        undefined,
        'a suite não deveria existir antes da resolução',
      );

      await collectAllItems(controller, state);
      assert.strictEqual(
        state.isResolved(`schema:${user}`),
        true,
        'após resolver, o schema deveria estar resolvido',
      );
    } finally {
      controller.dispose();
      await dropPackage(dbc, LAZY_PKG);
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
});
