/// <reference types="mocha" />
import * as assert from 'node:assert';
import * as vscode from 'vscode';

// Thick mode (Instant Client) — opt-in. Só roda quando ORACLE_CLIENT_LIB_DIR
// aponta para um Instant Client compatível; sem isso o bloco é skipado.
// ATENÇÃO: a inicialização thick é global e irreversível no processo — por isso
// este arquivo é separado e só deve rodar quando o ambiente for thick-capable.

const libDir = process.env.ORACLE_CLIENT_LIB_DIR;
const describeThick = libDir ? describe : describe.skip;

function hasConnection(): boolean {
  return !!process.env.UTPLSQL_CONN;
}

async function loadOracledb(): Promise<typeof import('oracledb')> {
  const mod = await import('oracledb');
  return (
    ((mod as Record<string, unknown>).default as typeof import('oracledb')) ??
    (mod as typeof import('oracledb'))
  );
}

describeThick('thick mode (Instant Client) — opt-in', () => {
  before(async function () {
    this.timeout(60_000);
    const ext = vscode.extensions.getExtension('paneb.vscode-utplsql');
    await ext?.activate();
  });

  it('ensureOracleClient inicializa thick e fixa o modo do processo', async function () {
    this.timeout(60_000);
    const {
      ensureOracleClient,
      getOracleClientMode,
      resetOracleClientStateForTests,
    } = require('../../oracleClient.js');
    resetOracleClientStateForTests();
    const oracledb = await loadOracledb();
    const res = ensureOracleClient(
      oracledb,
      'thick',
      libDir as string,
      process.env.TNS_ADMIN ?? '',
    );
    assert.strictEqual(res.thick, true, `thick deveria inicializar: ${res.error ?? ''}`);
    assert.strictEqual(getOracleClientMode(), 'thick');
  });

  it('conecta no banco já em thick mode', async function () {
    this.timeout(60_000);
    if (!hasConnection()) {
      this.skip();
      return;
    }
    const oracledb = await loadOracledb();
    const connStr = process.env.UTPLSQL_CONN as string;
    const m = connStr.match(/^([^/]+)\/([^@]+)@\/\/(.+)$/);
    assert.ok(m, 'UTPLSQL_CONN deve ser user/pass@//host:port/svc');
    const conn = await oracledb.getConnection({
      user: m[1],
      password: m[2],
      connectString: m[3],
    });
    try {
      const r = await conn.execute('SELECT 1 AS n FROM dual');
      assert.ok(r.rows && r.rows.length === 1, 'deveria executar SELECT em dual');
    } finally {
      await conn.close().catch(() => {});
    }
  });
});
