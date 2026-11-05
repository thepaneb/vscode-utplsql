/// <reference types="mocha" />
import * as assert from 'node:assert';
import * as vscode from 'vscode';
import { readConfig } from '../../config';
import { withOracleConnection } from '../../oracleRunner';
import { firstCol, installOutFormatIsolation } from './helpers';
import { observerConnection } from './support/unpriv';

// PRD-101: depois da última atividade Oracle, nenhuma sessão do pool sobrevive
// (quando utplsql.oraclePoolCloseAfterRun está ligado). O observador precisa de
// SELECT ON V_$SESSION (setup.sh); sem o grant, o teste faz skip.
const hasConn = Boolean(process.env.UTPLSQL_CONN);
const describeDB = hasConn ? describe : describe.skip;

describeDB('PRD-101: fecha pool ocioso após a operação', () => {
  installOutFormatIsolation();
  let db: typeof import('oracledb');
  let connStr: string;

  before(async function () {
    this.timeout(120_000);
    const ext = vscode.extensions.getExtension('paneb.vscode-utplsql');
    await ext?.activate();
    const mod = await import('oracledb');
    db = ((mod as Record<string, unknown>).default as typeof import('oracledb')) ?? mod;
    connStr = process.env.UTPLSQL_CONN as string;
  });

  it('a sessão usada pela operação não permanece em v$session', async function () {
    this.timeout(120_000);
    const cfg = readConfig();
    if (!cfg.oraclePoolCloseAfterRun) this.skip();

    const parts = observerConnection();
    assert.ok(parts, 'conexão do observador ausente');
    let sid = 0;
    await withOracleConnection(db, connStr, cfg, async (conn) => {
      const result = await conn.execute(`SELECT SYS_CONTEXT('USERENV','SID') FROM dual`);
      sid = Number(firstCol(result.rows?.[0]));
      return undefined;
    });
    assert.ok(sid > 0, 'SID da conexão do pool não obtido');

    // close(0) é assíncrono; dá um instante para o driver encerrar a sessão.
    await new Promise((resolve) => setTimeout(resolve, 500));

    const observer = await db.getConnection(parts);
    try {
      let result: { rows?: unknown[] };
      try {
        result = await observer.execute('SELECT COUNT(*) FROM v$session WHERE sid = :sid', { sid });
      } catch {
        this.skip();
        return;
      }
      assert.strictEqual(Number(firstCol(result.rows?.[0])), 0, 'sessão do pool sobreviveu');
    } finally {
      await observer.close().catch(() => {});
    }
  });
});
