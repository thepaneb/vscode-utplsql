/// <reference types="mocha" />
import * as assert from 'node:assert';

// Thick mode (Instant Client) — opt-in. Só roda quando
// UTPLSQL_THICK_TEST=1 **e** ORACLE_CLIENT_LIB_DIR aponta para um Instant Client
// compatível. A flag dedicada evita que a suíte normal (que herda o
// ORACLE_CLIENT_LIB_DIR do .env) rode o thick por engano — o thick é global e
// irreversível, e quebraria o teste que garante o thin default.
//
// Roda com `npm run test:integration:thick`, num workspace vazio
// (`.vscode-test.thick.mjs`) e SEM ativar a extensão: se a extensão ativasse
// antes, criaria uma conexão thin e o thick falharia com NJS-118.

const libDir = process.env.ORACLE_CLIENT_LIB_DIR;
const thickEnabled = process.env.UTPLSQL_THICK_TEST === '1' && !!libDir;
const describeThick = thickEnabled ? describe : describe.skip;

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
    assert.strictEqual(oracledb.thin, false, 'o driver deveria estar em thick mode');
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
