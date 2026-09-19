/// <reference types="mocha" />
import * as assert from 'node:assert';
import * as vscode from 'vscode';
import {
  checkDebugAccess,
  DbmsDebugClient,
  type DebugBindCodes,
  parseBreakpointTarget,
} from '../../dbmsDebug';

// Caminho real do DBMS_DEBUG contra uma **function standalone** (não package).
// Guarda os bugs de namespace/unidade: subprograma top-level exige
// `namespace_pkgspec_or_toplevel` e o nome do dicionário em MAIÚSCULAS — com
// `namespace_pkg_body`/nome minúsculo o SET_BREAKPOINT falha silenciosamente.
//
// Pré-requisitos: grants DEBUG CONNECT SESSION + EXECUTE ON DBMS_DEBUG e
// UTPLSQL_CONN no .env (sem isso, `describe.skip`).

function hasConnection(): boolean {
  return !!process.env.UTPLSQL_CONN;
}
const describeDB = hasConnection() ? describe : describe.skip;

const FN = 'UTPLSQL_DBG_FN';

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

describeDB('debugger DBMS_DEBUG — function standalone (namespace toplevel)', () => {
  before(async function () {
    this.timeout(120_000);
    const ext = vscode.extensions.getExtension('paneb.vscode-utplsql');
    await ext?.activate();
  });

  it('para no breakpoint, lê o frame e encerra', async function () {
    this.timeout(120_000);
    const mod = await import('oracledb');
    const oracledb =
      ((mod as Record<string, unknown>).default as typeof import('oracledb')) ??
      (mod as typeof import('oracledb'));
    const { user, password, connectString } = connParts();
    const setup = await oracledb.getConnection({ user, password, connectString });
    let target: import('oracledb').Connection | undefined;
    let debugConn: import('oracledb').Connection | undefined;
    try {
      setup.callTimeout = 10_000;
      await setup.execute('ALTER SESSION SET PLSQL_OPTIMIZE_LEVEL = 1', {}, { autoCommit: false });
      await setup.execute(
        `BEGIN EXECUTE IMMEDIATE 'DROP FUNCTION ${FN}'; EXCEPTION WHEN OTHERS THEN NULL; END;`,
        {},
        { autoCommit: true },
      );
      // Linha 6 = RETURN (executada quando p não é nulo).
      await setup.execute(
        `CREATE OR REPLACE FUNCTION ${FN}(p IN NUMBER) RETURN NUMBER IS
         BEGIN
           IF p IS NULL THEN
             RAISE_APPLICATION_ERROR(-20001, 'nulo');
           END IF;
           RETURN p + 1;
         END;`,
        {},
        { autoCommit: true },
      );
      await setup.execute(
        `ALTER FUNCTION ${FN} COMPILE DEBUG PLSQL_OPTIMIZE_LEVEL = 1`,
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

      const runP = target
        .execute(`BEGIN :r := ${FN}(1); END;`, {
          r: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
        })
        .catch(() => undefined);
      void runP;

      await withTimeout(clientDebug.synchronize(), 30_000, 'synchronize');

      // parseBreakpointTarget deve devolver toplevel + unit em maiúsculas.
      const bpTarget = parseBreakpointTarget(`/ws/${FN.toLowerCase()}.fnc`, user);
      assert.deepStrictEqual(bpTarget.namespaces, ['toplevel']);
      assert.strictEqual(bpTarget.unit, FN);
      bpTarget.line = 6;

      const bpId = await withTimeout(clientDebug.setBreakpoint(bpTarget), 20_000, 'setBreakpoint');
      assert.ok(bpId >= 0, 'breakpoint na function standalone deveria ser criado');

      let status = 'no_break';
      for (let i = 0; i < 10 && status === 'no_break'; i++) {
        status = await withTimeout(clientDebug.continueRun(), 30_000, `continue#${i}`);
      }
      assert.strictEqual(status, 'break', 'deveria parar no breakpoint');
      const frame = await withTimeout(clientDebug.getRuntimeFrame(1), 20_000, 'frame');
      assert.match(frame.name, new RegExp(FN, 'i'));
      assert.strictEqual(frame.line, 6);

      await withTimeout(clientDebug.detachSession(), 5_000, 'detach').catch(() => {});
      await withTimeout(clientTarget.debugOff(), 5_000, 'debugOff').catch(() => {});
    } finally {
      // Libera locks antes do DROP: cancela o statement pendente e fecha.
      if (target) await target.break?.().catch(() => {});
      await withTimeout(Promise.resolve(target?.close()), 5_000, 'close-target').catch(() => {});
      await withTimeout(Promise.resolve(debugConn?.close()), 5_000, 'close-debug').catch(() => {});
      await setup
        .execute(
          `BEGIN EXECUTE IMMEDIATE 'DROP FUNCTION ${FN}'; EXCEPTION WHEN OTHERS THEN NULL; END;`,
          {},
          { autoCommit: true },
        )
        .catch(() => {});
      await setup.close().catch(() => {});
    }
  });
});
