/// <reference types="mocha" />
import * as assert from 'node:assert';
import * as vscode from 'vscode';
import { compileForDebug } from '../../compileForDebug';
import { firstCol, installOutFormatIsolation } from './helpers';

// PRD-73: compila um objeto real com informação de debug (ALTER … COMPILE DEBUG)
// e confirma que o objeto continua VALID após a operação.
// Gate: UTPLSQL_CONN no .env (mesma regra dos demais testes de integração).

const describeDB = process.env.UTPLSQL_CONN ? describe : describe.skip;

describeDB('compileForDebug (PRD-73)', () => {
  installOutFormatIsolation();

  before(async () => {
    const ext = vscode.extensions.getExtension('paneb.vscode-utplsql');
    await ext?.activate();
  });

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

  it('compila uma procedure com debug e mantém o objeto VALID', async () => {
    const owner = connParts().user.toUpperCase();
    const name = 'UT_PRJ73_IT';
    const conn = await openRaw();
    try {
      await conn.execute(`CREATE OR REPLACE PROCEDURE ${name} AS BEGIN NULL; END;`);

      const result = await compileForDebug([{ name, kinds: ['procedure'] }]);
      assert.deepStrictEqual(result.failed, []);
      assert.strictEqual(result.ok.length, 1);

      const probe = await conn.execute(
        `SELECT status FROM all_objects WHERE owner = :owner AND object_name = :name AND object_type = 'PROCEDURE'`,
        { owner, name },
      );
      assert.strictEqual(firstCol(probe.rows?.[0]), 'VALID');
    } finally {
      await conn.execute(`DROP PROCEDURE ${name}`).catch(() => {});
      await conn.close().catch(() => {});
    }
  });
});
