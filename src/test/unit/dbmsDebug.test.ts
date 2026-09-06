import './setup.js';
import assert from 'node:assert';
import { test } from 'node:test';
import {
  checkDebugAccess,
  DbmsDebugClient,
  type DebugConnection,
  parseBreakpointTarget,
} from '../../dbmsDebug';

function makeConn(
  executeImpl: (sql: string) => Promise<{ rows?: unknown[]; outBinds?: Record<string, unknown> }>,
) {
  const calls: string[] = [];
  const conn: DebugConnection = {
    execute: async (sql: string) => {
      calls.push(sql);
      return executeImpl(sql);
    },
    close: async () => {},
  };
  return { conn, calls };
}

test('dbmsDebugClient: debugOn retorna session id', async () => {
  const { conn } = makeConn(async () => ({ outBinds: { session: 'SESS-XYZ' } }));
  const client = new DbmsDebugClient(conn);
  assert.strictEqual(await client.debugOn(), 'SESS-XYZ');
});

test('dbmsDebugClient: setBreakpoint retorna id', async () => {
  const { conn } = makeConn(async () => ({ outBinds: { brkpt: 42 } }));
  const client = new DbmsDebugClient(conn);
  const id = await client.setBreakpoint({ owner: 'APP', unit: 'PKG', line: 5 });
  assert.strictEqual(id, 42);
});

test('dbmsDebugClient: setBreakpoint sem outBinds retorna -1', async () => {
  const { conn } = makeConn(async () => ({}));
  const client = new DbmsDebugClient(conn);
  assert.strictEqual(await client.setBreakpoint({ owner: 'A', unit: 'B', line: 1 }), -1);
});

test('dbmsDebugClient: deleteBreakpoint nao lanca', async () => {
  const { conn, calls } = makeConn(async () => ({}));
  const client = new DbmsDebugClient(conn);
  await client.deleteBreakpoint(7);
  assert.ok(calls[0].includes('DELETE_BREAKPOINT'));
});

test('dbmsDebugClient: synchronize/continue/stepInto/stepOver/stepOut traduzem BREAK', async () => {
  const { conn } = makeConn(async () => ({ outBinds: { status: 2 } }));
  const client = new DbmsDebugClient(conn);
  assert.strictEqual(await client.synchronize(), 'break');
  assert.strictEqual(await client.continueRun(), 'break');
  assert.strictEqual(await client.stepInto(), 'break');
  assert.strictEqual(await client.stepOver(), 'break');
  assert.strictEqual(await client.stepOut(), 'break');
});

test('dbmsDebugClient: step com status EXITING vira exiting', async () => {
  const { conn } = makeConn(async () => ({ outBinds: { status: 5 } }));
  const client = new DbmsDebugClient(conn);
  assert.strictEqual(await client.stepOver(), 'exiting');
});

test('dbmsDebugClient: getRuntimeFrame retorna name/line', async () => {
  const { conn } = makeConn(async () => ({ outBinds: { name: 'APP.CALC', line: 10 } }));
  const client = new DbmsDebugClient(conn);
  const frame = await client.getRuntimeFrame(1);
  assert.deepStrictEqual(frame, { name: 'APP.CALC', line: 10, frameId: 1 });
});

test('dbmsDebugClient: getVariables retorna linhas', async () => {
  const { conn } = makeConn(async () => ({
    rows: [
      ['x', '1', 'NUMBER'],
      ['y', 'foo', 'VARCHAR2'],
    ],
  }));
  const client = new DbmsDebugClient(conn);
  const vars = await client.getVariables();
  assert.strictEqual(vars.length, 2);
  assert.deepStrictEqual(vars[0], { name: 'x', value: '1', type: 'NUMBER' });
});

test('dbmsDebugClient: attachSession ok retorna true; erro retorna false', async () => {
  let fail = false;
  const { conn } = makeConn(async () => {
    if (fail) throw new Error('ORA-00001');
    return {};
  });
  const client = new DbmsDebugClient(conn);
  assert.strictEqual(await client.attachSession('S', 30), true);
  fail = true;
  assert.strictEqual(await client.attachSession('S', 30), false);
});

test('checkDebugAccess: acesso ok retorna true; erro retorna false', async () => {
  const ok = await checkDebugAccess({
    execute: async () => ({ rows: [] }),
    close: async () => {},
  });
  assert.strictEqual(ok, true);

  const denied = await checkDebugAccess({
    execute: async () => {
      throw new Error('ORA-00942');
    },
    close: async () => {},
  });
  assert.strictEqual(denied, false);
});

test('parseBreakpointTarget: extrai owner/unit do caminho', () => {
  const t = parseBreakpointTarget('/ws/install/packages/test_app.pkb', 'DEV');
  assert.deepStrictEqual(t, { owner: 'DEV', unit: 'test_app', line: 0 });
});
