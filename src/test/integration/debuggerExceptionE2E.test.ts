/// <reference types="mocha" />
import * as assert from 'node:assert';
import * as vscode from 'vscode';
import { checkDebugAccess, DbmsDebugClient, type DebugBindCodes } from '../../dbmsDebug';

// E2E do PRD-86: `continueRun(breakOnException)` reflete o `stopOnException`.
// Sem `DBMS_DEBUG.break_exception` o DBMS_DEBUG roda até o fim mesmo com exceção;
// com ele, suspende em `reason_exception` (a base da setting).
// Pré-requisitos: grants de debug e PLSQL_OPTIMIZE_LEVEL <= 1. Gate: UTPLSQL_CONN.

function hasConnection(): boolean {
  return !!process.env.UTPLSQL_CONN;
}
const describeDB = hasConnection() ? describe : describe.skip;

const PACKAGE = 'UTPLSQL_EXC_E2E';

function connParts(): { user: string; password: string; connectString: string } {
  const conn = process.env.UTPLSQL_CONN as string;
  const m = conn.match(/^([^/]+)\/([^@]+)@\/\/(.+)$/);
  assert.ok(m, 'UTPLSQL_CONN deve ser user/pass@//host:port/svc');
  return { user: m[1], password: m[2], connectString: m[3] };
}

function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`timeout: ${label}`)), ms)),
  ]);
}

describeDB('debugger DBMS_DEBUG — exceção (break_exception / stopOnException)', () => {
  before(async function () {
    this.timeout(120_000);
    const ext = vscode.extensions.getExtension('paneb.vscode-utplsql');
    await ext?.activate();
  });

  /** Roda o package que lança e devolve a sequência de paradas do CONTINUE. */
  async function scenario(
    breakOnException: boolean,
    skip: () => void,
  ): Promise<{ reasons: string[]; frameLine?: number }> {
    const mod = await import('oracledb');
    const oracledb =
      ((mod as Record<string, unknown>).default as typeof import('oracledb')) ??
      (mod as typeof import('oracledb'));
    const { user, password, connectString } = connParts();
    const setup = await oracledb.getConnection({ user, password, connectString });
    let target: import('oracledb').Connection | undefined;
    let debugConn: import('oracledb').Connection | undefined;
    try {
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
             RAISE_APPLICATION_ERROR(-20001, 'boom');
           END p;
         END ${PACKAGE};`,
        {},
        { autoCommit: true },
      );

      target = await oracledb.getConnection({ user, password, connectString });
      debugConn = await oracledb.getConnection({ user, password, connectString });
      if (!(await checkDebugAccess(debugConn))) {
        skip();
        return { reasons: [] };
      }
      const codes: DebugBindCodes = {
        BIND_OUT: oracledb.BIND_OUT,
        STRING: oracledb.STRING,
        NUMBER: oracledb.NUMBER,
      };
      const clientTarget = new DbmsDebugClient(target, codes);
      const clientDebug = new DbmsDebugClient(debugConn, codes);

      const sessionId = await withTimeout(clientTarget.debugOn(), 20_000, 'debugOn');
      await withTimeout(clientDebug.attachSession(sessionId, 30), 20_000, 'attach');

      const runP = target.execute(`BEGIN ${PACKAGE}.p; END;`).catch(() => undefined);
      await withTimeout(clientDebug.synchronize(), 30_000, 'synchronize');

      const reasons: string[] = [];
      let frameLine: number | undefined;
      for (let i = 0; i < 4; i++) {
        const reason = await withTimeout(
          clientDebug.continueRun(breakOnException),
          30_000,
          `continue#${i}`,
        );
        reasons.push(reason);
        if (reason === 'exception') {
          const frame = await withTimeout(clientDebug.getRuntimeFrame(1), 20_000, 'frame');
          frameLine = frame.line;
        }
        if (reason === 'exiting' || reason === 'unknown') break;
      }
      await withTimeout(runP, 8_000, 'target-run').catch(() => {});

      await withTimeout(clientDebug.detachSession(), 5_000, 'detach').catch(() => {});
      await withTimeout(clientTarget.debugOff(), 5_000, 'debugOff').catch(() => {});
      return { reasons, frameLine };
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
  }

  it('breakOnException=true suspende em reason_exception', async function () {
    this.timeout(90_000);
    const { reasons, frameLine } = await scenario(true, () => this.skip());
    if (reasons.length === 0) return; // skip
    assert.strictEqual(reasons[0], 'exception', `paradas: ${reasons.join(', ')}`);
    assert.strictEqual(frameLine, 6, `linha do frame: ${frameLine}`);
    assert.strictEqual(reasons.at(-1), 'exiting');
  });

  it('breakOnException=false não suspende na exceção', async function () {
    this.timeout(90_000);
    const { reasons } = await scenario(false, () => this.skip());
    if (reasons.length === 0) return; // skip
    assert.ok(
      !reasons.includes('exception'),
      `não deveria parar na exceção: ${reasons.join(', ')}`,
    );
    assert.strictEqual(reasons[0], 'exiting');
  });
});
