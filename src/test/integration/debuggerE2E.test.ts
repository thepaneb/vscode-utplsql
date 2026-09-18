/// <reference types="mocha" />
import * as assert from 'node:assert';
import * as vscode from 'vscode';
import { checkDebugAccess, DbmsDebugClient, type DebugBindCodes } from '../../dbmsDebug';

// Ciclo real do DBMS_DEBUG: compila um package com debug info, define um
// breakpoint e percorre break -> frame -> variável -> exiting usando o
// DbmsDebugClient (as assinaturas reais, não as antigas).
//
// Pré-requisitos: grants DEBUG CONNECT SESSION + EXECUTE ON DBMS_DEBUG (o
// bootstrap da matriz concede) e código compilado com PLSQL_OPTIMIZE_LEVEL <= 1.
// Gate: UTPLSQL_CONN no .env.

function hasConnection(): boolean {
  return !!process.env.UTPLSQL_CONN;
}
const describeDB = hasConnection() ? describe : describe.skip;

const PACKAGE = 'UTPLSQL_DBG_E2E';

function connParts(): { user: string; password: string; connectString: string } {
  const conn = process.env.UTPLSQL_CONN as string;
  const m = conn.match(/^([^/]+)\/([^@]+)@\/\/(.+)$/);
  assert.ok(m, 'UTPLSQL_CONN deve ser user/pass@//host:port/svc');
  return { user: m[1], password: m[2], connectString: m[3] };
}

/** Rejeita se a operação de debug não responder em `ms` (evita travar a suíte). */
function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`timeout: ${label}`)), ms)),
  ]);
}

describeDB('debugger DBMS_DEBUG — ciclo real (breakpoint -> stop -> frame)', () => {
  before(async function () {
    this.timeout(120_000);
    const ext = vscode.extensions.getExtension('paneb.vscode-utplsql');
    await ext?.activate();
  });

  it('para no breakpoint, lê o frame e a variável, e encerra', async function () {
    this.timeout(90_000);
    const mod = await import('oracledb');
    const oracledb =
      ((mod as Record<string, unknown>).default as typeof import('oracledb')) ??
      (mod as typeof import('oracledb'));
    const { user, password, connectString } = connParts();
    const setup = await oracledb.getConnection({ user, password, connectString });
    let target: import('oracledb').Connection | undefined;
    let debugConn: import('oracledb').Connection | undefined;
    try {
      // Package compilado com debug info (optimize level 1).
      await setup.execute('ALTER SESSION SET PLSQL_OPTIMIZE_LEVEL = 1', {}, { autoCommit: false });
      await setup.execute(
        `BEGIN EXECUTE IMMEDIATE 'DROP PACKAGE ${PACKAGE}'; EXCEPTION WHEN OTHERS THEN NULL; END;`,
        {},
        { autoCommit: true },
      );
      await setup.execute(
        `CREATE OR REPLACE PACKAGE ${PACKAGE} AS PROCEDURE p; END ${PACKAGE};`,
        {},
        { autoCommit: true },
      );
      await setup.execute(
        `CREATE OR REPLACE PACKAGE BODY ${PACKAGE} AS
           PROCEDURE p IS
             x NUMBER := 1;
           BEGIN
             x := x + 1;
             x := x + 2;
           END p;
         END ${PACKAGE};`,
        {},
        { autoCommit: true },
      );

      target = await oracledb.getConnection({ user, password, connectString });
      debugConn = await oracledb.getConnection({ user, password, connectString });
      if (!(await checkDebugAccess(debugConn))) {
        this.skip();
        return;
      }
      const codes: DebugBindCodes = {
        BIND_OUT: oracledb.BIND_OUT,
        STRING: oracledb.STRING,
        NUMBER: oracledb.NUMBER,
      };

      const clientTarget = new DbmsDebugClient(target, codes);
      const clientDebug = new DbmsDebugClient(debugConn, codes);

      const sessionId = await withTimeout(clientTarget.debugOn(), 20_000, 'debugOn');
      assert.ok(sessionId.length > 0, 'INITIALIZE deveria retornar um debug session id');
      assert.strictEqual(
        await withTimeout(clientDebug.attachSession(sessionId, 30), 20_000, 'attach'),
        true,
      );

      // O target entra em debug mode e pausa no início; o debugger aguarda o
      // primeiro evento e só então define o breakpoint (deferred é ignorado).
      const runP = target.execute(`BEGIN ${PACKAGE}.p; END;`).catch(() => undefined);
      await withTimeout(clientDebug.synchronize(), 30_000, 'synchronize');
      const bpId = await withTimeout(
        clientDebug.setBreakpoint({ owner: user.toUpperCase(), unit: PACKAGE, line: 5 }),
        20_000,
        'setBreakpoint',
      );
      assert.ok(bpId >= 0, 'SET_BREAKPOINT deveria retornar um id');

      assert.strictEqual(
        await withTimeout(clientDebug.continueRun(), 30_000, 'continue#1'),
        'break',
      );
      const frame = await withTimeout(clientDebug.getRuntimeFrame(1), 20_000, 'frame');
      assert.strictEqual(frame.line, 5, `linha do frame: ${frame.line}`);
      assert.match(frame.name, new RegExp(PACKAGE, 'i'));

      const vars = await withTimeout(clientDebug.getVariables(['x']), 20_000, 'variables');
      assert.strictEqual(vars[0]?.name, 'x');
      assert.strictEqual(vars[0]?.value, '1');

      assert.strictEqual(
        await withTimeout(clientDebug.continueRun(), 30_000, 'continue#2'),
        'exiting',
      );
      // O fim da execução do target pode ficar preso a um último CONTINUE; não
      // bloqueia o resultado do teste.
      await withTimeout(runP, 8_000, 'target-run').catch(() => {});

      await withTimeout(clientDebug.detachSession(), 5_000, 'detach').catch(() => {});
      await withTimeout(clientTarget.debugOff(), 5_000, 'debugOff').catch(() => {});
    } finally {
      if (target) await withTimeout(target.close(), 5_000, 'close-target').catch(() => {});
      if (debugConn) await withTimeout(debugConn.close(), 5_000, 'close-debug').catch(() => {});
      await setup
        .execute(
          `BEGIN EXECUTE IMMEDIATE 'DROP PACKAGE ${PACKAGE}'; EXCEPTION WHEN OTHERS THEN NULL; END;`,
          {},
          { autoCommit: true },
        )
        .catch(() => {});
      await setup.close().catch(() => {});
    }
  });
});
