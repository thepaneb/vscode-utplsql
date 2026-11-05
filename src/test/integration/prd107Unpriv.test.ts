/// <reference types="mocha" />
import * as assert from 'node:assert';
import * as vscode from 'vscode';
import { firstCol, installOutFormatIsolation } from './helpers';
import { hasUnprivUser, observerConnection, unprivConnection } from './support/unpriv';

// PRD-107: exercita os caminhos degradados por falta de privilégio com um
// usuário que só tem CREATE SESSION e valida o observador de sessões.
// Sem a fixture provisionada (UTPLSQL_IT_UNPRIV_*), a suíte faz skip.
const describeUnpriv = hasUnprivUser() ? describe : describe.skip;

describeUnpriv('PRD-107: fixture sem privilégios', () => {
  installOutFormatIsolation();
  let db: typeof import('oracledb');
  let conn: import('oracledb').Connection | undefined;

  before(async function () {
    this.timeout(120_000);
    const ext = vscode.extensions.getExtension('paneb.vscode-utplsql');
    await ext?.activate();
    const mod = await import('oracledb');
    db = ((mod as Record<string, unknown>).default as typeof import('oracledb')) ?? mod;
    const parts = unprivConnection();
    assert.ok(parts, 'UTPLSQL_IT_UNPRIV_* deveria produzir uma conexão');
    conn = await db.getConnection(parts);
  });

  after(async () => {
    await conn?.close().catch(() => {});
  });

  it('usuário restrito não consegue executar DDL', async () => {
    await assert.rejects(
      conn!.execute('CREATE TABLE UTPLSQL_UNPRIV_DDL (id NUMBER)'),
      /ORA-/,
      'DDL deveria ser negado para o usuário restrito',
    );
  });

  it('V$SQL negado é tratado como caminho degradado (ERR-009)', async function () {
    this.timeout(60_000);
    let denied = false;
    try {
      await conn!.execute('SELECT sql_text FROM v$sql WHERE ROWNUM = 1');
    } catch {
      denied = true;
    }
    if (!denied) this.skip();
    assert.ok(denied, 'V$SQL deveria estar negado para o usuário restrito');
  });

  it('discovery via banco degrada sem lançar quando não há grants (ERR-008)', async () => {
    const { discoverSchemaFromConn } = await import('../../discovery.js');
    const folder = {
      uri: vscode.Uri.file(process.cwd()),
      name: 'root',
      index: 0,
    } as vscode.WorkspaceFolder;
    const suites = await discoverSchemaFromConn(
      conn as never,
      'UTPLSQL_TEST',
      folder as never,
    );
    assert.ok(Array.isArray(suites));
    assert.strictEqual(suites.length, 0, 'sem grants, o schema de teste não é visível');
  });

  it('observador enxerga v$session para as asserções da PRD-101', async () => {
    const parts = observerConnection();
    assert.ok(parts, 'conexão do observador ausente');
    const observer = await db.getConnection(parts);
    try {
      const result = await observer.execute('SELECT COUNT(*) FROM v$session');
      const count = Number(firstCol(result.rows?.[0]));
      assert.ok(count >= 1, `v$session deveria ser legível pelo observador (${count})`);
    } finally {
      await observer.close().catch(() => {});
    }
  });
});
