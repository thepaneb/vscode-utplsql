/// <reference types="mocha" />
import * as assert from 'node:assert';
import * as vscode from 'vscode';
import { firstCol, installOutFormatIsolation } from './helpers';

// Integração em banco real (PRD-70 / bugfix 0.12.1):
//   - diretivas SQL*Plus (PROMPT/SHOW ERRORS) são ignoradas e o DDL PL/SQL roda
//     de ponta a ponta;
//   - o driver segue em thin mode por padrão após conectar.
// Gate: UTPLSQL_CONN no .env.

function hasConnection(): boolean {
  return !!process.env.UTPLSQL_CONN;
}
const describeDB = hasConnection() ? describe : describe.skip;

function parseEnv(): { user: string; password: string; connectString: string } {
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
  const { user, password, connectString } = parseEnv();
  return oracledb.getConnection({ user, password, connectString });
}

const FN = 'UTPLSQL_SPLX_IT70';

async function dropFunction(dbc: import('oracledb').Connection, name: string): Promise<void> {
  try {
    await dbc.execute(
      `BEGIN EXECUTE IMMEDIATE 'DROP FUNCTION ${name}'; EXCEPTION WHEN OTHERS THEN NULL; END;`,
      {},
      { autoCommit: true },
    );
  } catch {
    /* ignore */
  }
}

describeDB('v0.12.1 — script com diretivas SQL*Plus (banco real)', () => {
  installOutFormatIsolation();

  before(async () => {
    const ext = vscode.extensions.getExtension('paneb.vscode-utplsql');
    await ext?.activate();
  });

  it('executa DDL PL/SQL com header de comentários + PROMPT + SHOW ERRORS', async function () {
    this.timeout(120_000);
    const connStr = process.env.UTPLSQL_CONN as string;
    const dbc = await openRaw();
    try {
      await dropFunction(dbc, FN);
      const { splitScript, executeScript, connectOracle } = require('../../scriptRunner.js');
      const script =
        '-- header do export\n' +
        '-- @D:\\reposit\\pkg.sql\n' +
        `PROMPT Creating Function '${FN}'\n` +
        `CREATE OR REPLACE FUNCTION ${FN}(p IN VARCHAR2) RETURN VARCHAR2\n` +
        'IS\n' +
        '  v VARCHAR2(100);\n' +
        'BEGIN\n' +
        '  v := UPPER(p);\n' +
        '  RETURN v;\n' +
        'END;\n' +
        '/\n' +
        `SHOW ERRORS FUNCTION ${FN}`;

      const statements = splitScript(script);
      assert.strictEqual(statements.length, 1, 'PROMPT/SHOW ERRORS deveriam ser ignorados');
      assert.ok(!/PROMPT|SHOW ERRORS/.test(statements[0].text));

      const lines: string[] = [];
      const result = await executeScript((c: string) => connectOracle(c, { timeoutSeconds: 60 }), {
        connection: connStr,
        statements,
        output: { appendLine: (v: string): void => void lines.push(v) },
        label: 'splx-it70.sql',
        charset: 'utf8',
      });
      assert.deepStrictEqual([result.executed, result.ok, result.failed], [1, 1, 0]);

      const status = await dbc.execute(
        `SELECT status FROM all_objects WHERE object_name = :n AND object_type = 'FUNCTION'`,
        { n: FN.toUpperCase() },
      );
      assert.strictEqual(firstCol(status.rows?.[0]), 'VALID');

      const call = await dbc.execute(`SELECT ${FN}('abc') FROM dual`);
      assert.strictEqual(firstCol(call.rows?.[0]), 'ABC');
    } finally {
      await dropFunction(dbc, FN);
      await dbc.close().catch(() => {});
    }
  });

  it('permanece em thin mode por padrão', async function () {
    this.timeout(60_000);
    const dbc = await openRaw();
    try {
      const { ensurePool } = require('../../oracleRunner.js');
      const { getOracleClientMode } = require('../../oracleClient.js');
      const { readConfig } = require('../../config.js');
      const mod = await import('oracledb');
      const oracledb =
        ((mod as Record<string, unknown>).default as typeof import('oracledb')) ??
        (mod as typeof import('oracledb'));
      await ensurePool(oracledb, process.env.UTPLSQL_CONN as string, readConfig());
      assert.notStrictEqual(
        getOracleClientMode(),
        'thick',
        'sem oracleClientMode=thick a extensão deveria usar thin',
      );
    } finally {
      const { closeOraclePool } = await import('../../oracleRunner.js');
      await closeOraclePool();
      await dbc.close().catch(() => {});
    }
  });
});
