/// <reference types="mocha" />
import * as assert from 'node:assert';
import * as vscode from 'vscode';

// E2E do PRD-68 RF1: `refreshCompilationDiagnostics` consulta ALL_ERRORS no banco
// real e publica no Problems Panel (source "utPLSQL Compilation"), mapeando o erro
// para o Uri da suite descoberta. Gate: UTPLSQL_CONN no .env.
// Objeto criado usa sufixo _IT68 e é removido no finally.

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

describeDB('compilationDiagnostics E2E — ALL_ERRORS → Problems Panel (PRD-68)', () => {
  const pkg = 'UTPLSQL_BADPKG_IT68';
  const uri = vscode.Uri.file(`/tmp/${pkg}.pks`);

  async function openRaw(): Promise<import('oracledb').Connection> {
    const mod = await import('oracledb');
    const oracledb =
      ((mod as Record<string, unknown>).default as typeof import('oracledb')) ??
      (mod as typeof import('oracledb'));
    const { user, password, connectString } = connParts();
    return oracledb.getConnection({ user, password, connectString });
  }

  before(async () => {
    const ext = vscode.extensions.getExtension('paneb.vscode-utplsql');
    await ext?.activate();
  });

  it('publica o erro no Uri da suite e limpa após o objeto voltar a ser válido', async function () {
    this.timeout(120_000);
    const {
      refreshCompilationDiagnostics,
      registerCompilationDiagnostics,
    } = require('../../compilationDiagnostics.js');
    const { TestStateManager } = require('../../state.js');

    // O módulo `out/` é distinto do bundle ativado; registra a collection nele
    // para que `refreshCompilationDiagnostics` tenha onde publicar.
    registerCompilationDiagnostics({ subscriptions: [] });

    const dbc = await openRaw();
    try {
      await dbc.execute(`DROP PACKAGE ${pkg}`, {}, { autoCommit: true }).catch(() => {});
      await dbc.execute(
        `CREATE OR REPLACE PACKAGE ${pkg} AS PROCEDURE p (x IN ${pkg}_TYPEDEF); END ${pkg};`,
        {},
        { autoCommit: true },
      );

      const state = new TestStateManager();
      const item = { id: `suite:${pkg.toLowerCase()}`, children: [] };
      state.setMeta(item, { kind: 'suite', packageName: pkg, uri });
      state.cachedItems.push(item);

      await refreshCompilationDiagnostics(state);
      const mine = vscode.languages
        .getDiagnostics(uri)
        .filter((d) => d.source === 'utPLSQL Compilation');
      assert.ok(mine.length > 0, 'deveria publicar o diagnóstico de compilação');
      assert.match(mine[0].message, /PLS-\d+/, `mensagem: ${mine[0].message}`);
      assert.strictEqual(mine[0].severity, vscode.DiagnosticSeverity.Error);

      // Corrige o objeto (e remove) → o diagnóstico some no próximo refresh.
      await dbc.execute(
        `CREATE OR REPLACE PACKAGE ${pkg} AS PROCEDURE p; END ${pkg};`,
        {},
        { autoCommit: true },
      );
      await dbc.execute(`DROP PACKAGE ${pkg}`, {}, { autoCommit: true });
      await refreshCompilationDiagnostics(state);

      const after = vscode.languages
        .getDiagnostics(uri)
        .filter((d) => d.source === 'utPLSQL Compilation');
      assert.strictEqual(after.length, 0);
    } finally {
      await dbc.execute(`DROP PACKAGE ${pkg}`, {}, { autoCommit: true }).catch(() => {});
      await dbc.close().catch(() => {});
    }
  });
});
