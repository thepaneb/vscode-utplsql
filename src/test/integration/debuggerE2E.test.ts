/// <reference types="mocha" />
import * as assert from 'node:assert';
import * as vscode from 'vscode';

// Integração do debugger: valida o contrato REAL do DBMS_DEBUG no ambiente
// (INITIALIZE / DEBUG_ON / DEBUG_OFF), que exige:
//   - privilégio DEBUG CONNECT SESSION + EXECUTE ON DBMS_DEBUG;
//   - código compilado com debug info (PLSQL_DEBUG / PLSQL_OPTIMIZE_LEVEL<=1).
//
// NOTA (bug conhecido): o cliente em `src/dbmsDebug.ts` usa assinaturas
// incorretas do DBMS_DEBUG (ex.: `DEBUG_ON()` como função que retorna id,
// `ATTACH_SESSION(session_id=>, timeout=>)`, `SET_BREAKPOINT(program=> string)`),
// então NÃO é exercitado aqui até ser corrigido. Este arquivo valida o ambiente
// contra a API documentada, que é o que uma implementação correta precisa.
//
// Gate: UTPLSQL_CONN no .env.

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

describeDB('debugger DBMS_DEBUG (contrato do ambiente)', () => {
  let debugAccess = false;

  before(async function () {
    this.timeout(60_000);
    const ext = vscode.extensions.getExtension('paneb.vscode-utplsql');
    await ext?.activate();
    const { checkDebugAccess } = require('../../dbmsDebug.js');
    const dbc = await openRaw();
    try {
      debugAccess = await checkDebugAccess({
        execute: (sql: string, binds?: Record<string, unknown>) =>
          dbc.execute(sql, (binds ?? {}) as never),
        close: () => dbc.close(),
      } as never);
    } finally {
      await dbc.close().catch(() => {});
    }
  });

  it('INITIALIZE retorna um debug session id e DEBUG_ON/DEBUG_OFF funcionam', async function () {
    this.timeout(60_000);
    if (!debugAccess) {
      this.skip();
      return;
    }
    const dbc = await openRaw();
    try {
      // INITIALIZE é a função que devolve o debugID (DEBUG_ON é procedure e não
      // retorna id — divergência com o cliente atual da extensão).
      const r = await dbc.execute(
        `DECLARE
           v_id VARCHAR2(100);
         BEGIN
           v_id := DBMS_DEBUG.INITIALIZE();
           :id := v_id;
         END;`,
        { id: { dir: 1 } as never },
        { outFormat: 4002 } as never,
      );
      const id = String(((r.outBinds ?? {}) as Record<string, unknown>).id ?? '');
      assert.ok(id.length > 0, 'INITIALIZE deveria retornar um debug session id');

      await dbc.execute(`BEGIN DBMS_DEBUG.DEBUG_ON(); END;`, {}, { autoCommit: false });
      await dbc.execute(`BEGIN DBMS_DEBUG.DEBUG_OFF(); END;`, {}, { autoCommit: false });
    } finally {
      // Garante DEBUG_OFF mesmo em falha, sem mascarar o erro do teste.
      await dbc.execute(`BEGIN DBMS_DEBUG.DEBUG_OFF(); END;`, {}).catch(() => {});
      await dbc.close().catch(() => {});
    }
  });
});
