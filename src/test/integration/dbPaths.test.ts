/// <reference types="mocha" />
import * as assert from 'node:assert';
import * as vscode from 'vscode';

// Caminhos que dependem do banco e não são cobertos por testes unitários:
//   - dbSourceProvider.fetchDbSource (ALL_SOURCE real) + cache do provider
//   - SetupValidator.validateOnActivation (conexão boa e inválida)
//   - testTree.mergeDbSuites (suite só no banco no modo schema)
//   - executeRunOracle com dbmsOutput (drenagem real de DBMS_OUTPUT)
// Gate: UTPLSQL_CONN no .env (mesma regra dos demais testes de integração).

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
  try {
    await dbc.execute(
      `BEGIN EXECUTE IMMEDIATE 'DROP PACKAGE ${name}'; EXCEPTION WHEN OTHERS THEN NULL; END;`,
      {},
      { autoCommit: true },
    );
  } catch {
    /* ignore */
  }
}

/**
 * Cria um package com `%suite` + `%test` que emite `marker` via DBMS_OUTPUT e
 * invalida o cache de anotações do utPLSQL (necessário para ut_runner.run
 * enxergar objetos criados fora do setup).
 */
async function createDbOnlyPackage(
  dbc: import('oracledb').Connection,
  name: string,
  marker: string,
): Promise<void> {
  await dropPackage(dbc, name);
  await dbc.execute(
    `CREATE OR REPLACE PACKAGE ${name} AS
       --%suite(Só no banco IT62)

       --%test(emite output)
       PROCEDURE emit;
     END ${name};`,
    {},
    { autoCommit: true },
  );
  await dbc.execute(
    `CREATE OR REPLACE PACKAGE BODY ${name} AS
       PROCEDURE emit IS
       BEGIN
         DBMS_OUTPUT.PUT_LINE('${marker}');
       END emit;
     END ${name};`,
    {},
    { autoCommit: true },
  );
  const owner = connParts().user.toUpperCase();
  await dbc.execute(
    `BEGIN ut3.ut_runner.rebuild_annotation_cache(:owner, 'PACKAGE'); END;`,
    { owner },
    { autoCommit: true },
  );
}

const DB_ONLY_PKG = 'UTPLSQL_DBONLY_IT62';
const OUT_PKG = 'UTPLSQL_OUT_IT62';

describeDB('caminhos só-DB (provider, setup, merge de schema, DBMS_OUTPUT)', () => {
  before(async () => {
    const ext = vscode.extensions.getExtension('paneb.vscode-utplsql');
    await ext?.activate();
  });

  it('fetchDbSource lê ALL_SOURCE real e devolve vazio para package inexistente', async function () {
    this.timeout(60_000);
    const { fetchDbSource } = require('../../dbSourceProvider.js');
    const user = connParts().user.toUpperCase();

    const text: string = await fetchDbSource(vscode.Uri.parse(`utplsql-db:/${user}/TEST_MATH.pks`));
    assert.ok(text.length > 0, 'deveria ler o fonte do package via ALL_SOURCE');
    assert.ok(/PACKAGE/i.test(text), 'fonte deveria conter a definição do PACKAGE');

    const missing: string = await fetchDbSource(
      vscode.Uri.parse(`utplsql-db:/${user}/UTPLSQL_NO_SUCH_PKG_XYZ.pks`),
    );
    assert.strictEqual(missing, '');
  });

  it('provider utplsql-db serve o mesmo conteúdo em aberturas repetidas (cache)', async function () {
    this.timeout(60_000);
    const user = connParts().user.toUpperCase();
    const uri = vscode.Uri.parse(`utplsql-db:/${user}/TEST_MATH.pks`);
    const first = await vscode.workspace.openTextDocument(uri);
    const second = await vscode.workspace.openTextDocument(uri);
    assert.ok(first.getText().length > 0, 'provider deveria retornar o fonte');
    assert.strictEqual(first.getText(), second.getText(), 'cache deveria devolver o mesmo texto');
  });

  it('validateOnActivation: conexão boa não gera BAD_CONN nem OLD_VERSION', async function () {
    this.timeout(120_000);
    const { setupValidator } = require('../../quickfix.js');
    const diags: { code: string }[] = await setupValidator.validateOnActivation();
    const codes = diags.map((d) => d.code);
    assert.ok(!codes.includes('UTPLSQL_BAD_CONN'), `diagnósticos inesperados: ${codes.join(',')}`);
    assert.ok(
      !codes.includes('UTPLSQL_OLD_VERSION'),
      `utPLSQL >= 3.1.0 deveria evitar OLD_VERSION: ${codes.join(',')}`,
    );
  });

  it('validateOnActivation: conexão inválida gera UTPLSQL_BAD_CONN', async function () {
    this.timeout(120_000);
    const { setupValidator } = require('../../quickfix.js');
    const cfg = vscode.workspace.getConfiguration('utplsql');
    const origConn = cfg.inspect<string>('connection');
    const origActive = cfg.inspect<string>('activeProfile');
    try {
      await cfg.update('activeProfile', '', vscode.ConfigurationTarget.Workspace);
      await cfg.update(
        'connection',
        'baduser/badpass@//127.0.0.1:1/nope',
        vscode.ConfigurationTarget.Workspace,
      );
      const diags: { code: string }[] = await setupValidator.validateOnActivation();
      assert.ok(
        diags.some((d) => d.code === 'UTPLSQL_BAD_CONN'),
        `esperava UTPLSQL_BAD_CONN, veio: ${diags.map((d) => d.code).join(',')}`,
      );
    } finally {
      await cfg.update(
        'activeProfile',
        origActive?.workspaceValue ?? undefined,
        vscode.ConfigurationTarget.Workspace,
      );
      await cfg.update(
        'connection',
        origConn?.workspaceValue ?? undefined,
        vscode.ConfigurationTarget.Workspace,
      );
    }
  });

  it('mergeDbSuites: suite só no banco entra na árvore no modo schema', async function () {
    this.timeout(120_000);
    const dbc = await openRaw();
    const root = vscode.workspace.workspaceFolders?.[0]?.uri;
    assert.ok(root, 'workspace folder required');
    const schemaDir = vscode.Uri.joinPath(root, 'db', 'UT3');
    await vscode.workspace.fs.createDirectory(schemaDir);

    const cfg = vscode.workspace.getConfiguration('utplsql');
    const origOrg = cfg.inspect<string>('organization');
    const origPattern = cfg.inspect<string>('organization.schemaPattern');
    const { createRefresher } = require('../../testTree.js');
    const { TestStateManager } = require('../../state.js');
    const controller = vscode.tests.createTestController('utplsql-it-merge', 'IT Merge');
    const state = new TestStateManager();
    try {
      await createDbOnlyPackage(dbc, DB_ONLY_PKG, 'db-only-marker');
      await cfg.update('organization', 'schema', vscode.ConfigurationTarget.Workspace);
      await cfg.update(
        'organization.schemaPattern',
        'db/{schema}/**',
        vscode.ConfigurationTarget.Workspace,
      );

      const refresh = createRefresher(controller, state);
      await refresh();

      assert.ok(
        state.getSuiteItem(`suite:${DB_ONLY_PKG.toLowerCase()}`),
        `suite ${DB_ONLY_PKG} (só no banco) deveria ser mesclada na árvore`,
      );
    } finally {
      controller.dispose();
      await dropPackage(dbc, DB_ONLY_PKG);
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

  it('executeRunOracle com dbmsOutput drena DBMS_OUTPUT da sessão dos testes', async function () {
    this.timeout(120_000);
    const dbc = await openRaw();
    const marker = 'utplsql-dbmsoutput-it62';
    try {
      await createDbOnlyPackage(dbc, OUT_PKG, marker);
      const { executeRunOracle } = require('../../oracleRunner.js');
      const { TestStateManager } = require('../../state.js');

      const output: string[] = [];
      const run = {
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
      const state = new TestStateManager();
      const token = {
        isCancellationRequested: false,
        onCancellationRequested: () => ({ dispose: () => {} }),
      };

      await executeRunOracle(
        {
          connection: process.env.UTPLSQL_CONN as string,
          pathArgs: [OUT_PKG.toLowerCase()],
          coverage: false,
          sourcePath: 'install',
          root: vscode.workspace.workspaceFolders?.[0]?.uri.fsPath as string,
          run: run as never,
          leafTests: [{ id: 'it-leaf' }] as never,
          state: state as never,
          dbmsOutput: true,
        },
        token as never,
      );

      const joined = output.join('\n');
      assert.ok(joined.includes(marker), `DBMS_OUTPUT deveria aparecer na saída. Veio:\n${joined}`);
    } finally {
      await dropPackage(dbc, OUT_PKG);
      await dbc.close().catch(() => {});
    }
  });
});
