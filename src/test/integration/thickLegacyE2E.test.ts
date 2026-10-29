/// <reference types="mocha" />
import * as assert from 'node:assert';
import * as path from 'node:path';
import * as vscode from 'vscode';

// E2E do eixo thick legado (PRD-123). Roda no host isolado de
// `.vscode-test.thick.mjs`, que aponta o workspace para um diretório vazio e
// deixa a conexão em `UTPLSQL_THICK_CONN` (o host NÃO abre thin).
//
// Gated por `UTPLSQL_THICK_TEST=1` + `UTPLSQL_THICK_CONN`; sem a conexão o
// teste faz skip e o `--thick` local sem matriz continua válido.
const thickEnabled = process.env.UTPLSQL_THICK_TEST === '1';
const describeThick = thickEnabled ? describe : describe.skip;

function hasConnection(): boolean {
  return !!process.env.UTPLSQL_THICK_CONN;
}

function connParts(): { user: string; password: string; connectString: string } {
  const connection = process.env.UTPLSQL_THICK_CONN as string;
  const m = connection.match(/^([^/]+)\/([^@]+)@\/\/(.+)$/);
  assert.ok(m, 'UTPLSQL_THICK_CONN deve ser user/pass@//host:port/svc');
  return { user: m[1], password: m[2], connectString: m[3] };
}

async function loadOracledb(): Promise<typeof import('oracledb')> {
  const mod = await import('oracledb');
  return (
    ((mod as Record<string, unknown>).default as typeof import('oracledb')) ??
    (mod as typeof import('oracledb'))
  );
}

describeThick('thick legado (11g) — execução, cobertura e descoberta DB-first', () => {
  before(() => {
    const libDir = process.env.ORACLE_CLIENT_LIB_DIR;
    assert.ok(libDir, 'ORACLE_CLIENT_LIB_DIR obrigatório no eixo thick');
  });

  it('executa test_math com streaming + cobertura Cobertura', async function () {
    this.timeout(180_000);
    if (!hasConnection()) {
      this.skip();
      return;
    }
    const libDir = process.env.ORACLE_CLIENT_LIB_DIR as string;
    const oracledb = await loadOracledb();
    const { ensureOracleClient } = require('../../oracleClient.js');
    const client = ensureOracleClient(oracledb, 'thick', libDir, process.env.TNS_ADMIN ?? '');
    assert.strictEqual(client.thick, true, `thick deveria inicializar: ${client.error ?? ''}`);

    const { executeRunOracle } = require('../../oracleRunner.js');
    const { TestStateManager } = require('../../state.js');
    const folder = vscode.workspace.workspaceFolders?.[0];
    assert.ok(folder, 'workspace folder required');
    const uri = vscode.Uri.file(path.join(folder.uri.fsPath, '..', 'test_math.pks'));
    const controller = vscode.tests.createTestController('thick-legacy-e2e', 'Thick Legacy E2E');
    const item = controller.createTestItem('thick-legacy:test_math', 'test_math', uri);
    const state = new TestStateManager();
    state.setMeta(item, {
      kind: 'suite',
      packageName: 'test_math',
      uri,
      folder,
    } as never);

    const request = new vscode.TestRunRequest([item]);
    const run = controller.createTestRun(request);
    let completed: { passed: number; failed: number; errored: number } | undefined;
    let coverage: boolean | undefined;
    try {
      await executeRunOracle(
        {
          connection: process.env.UTPLSQL_THICK_CONN as string,
          pathArgs: ['test_math'],
          coverage: true,
          sourcePath: '..',
          run,
          leafTests: [item],
          state,
          folders: [folder],
          onComplete: (passed: number, failed: number, _skipped: number, errored: number) => {
            completed = { passed, failed, errored };
          },
          onCoverageResult: (generated: boolean) => {
            coverage = generated;
          },
        },
        new vscode.CancellationTokenSource().token,
      );
    } finally {
      run.end();
      controller.dispose();
    }

    assert.deepStrictEqual(
      { passed: completed?.passed, failed: completed?.failed, errored: completed?.errored },
      { passed: 2, failed: 0, errored: 0 },
      `resultado inesperado: ${JSON.stringify(completed)}`,
    );
    assert.strictEqual(coverage, true, 'a cobertura Cobertura deveria ser gerada');
  });

  it('descobre test_math via ALL_SOURCE (SQL portátil no 11g)', async function () {
    this.timeout(120_000);
    if (!hasConnection()) {
      this.skip();
      return;
    }
    const libDir = process.env.ORACLE_CLIENT_LIB_DIR as string;
    const oracledb = await loadOracledb();
    const { ensureOracleClient } = require('../../oracleClient.js');
    ensureOracleClient(oracledb, 'thick', libDir, process.env.TNS_ADMIN ?? '');
    const { user, password, connectString } = connParts();
    const conn = await oracledb.getConnection({ user, password, connectString });
    try {
      const { discoverSchemaFromConn } = require('../../discovery.js');
      const folder = vscode.workspace.workspaceFolders?.[0];
      assert.ok(folder);
      const suites = await discoverSchemaFromConn(conn, user, folder);
      assert.ok(
        suites.some((s: { packageName: string }) => s.packageName === 'test_math'),
        'test_math deveria ser descoberto via ALL_SOURCE',
      );
    } finally {
      await conn.close().catch(() => {});
    }
  });
});
