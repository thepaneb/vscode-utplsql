import './setup.js';
import assert from 'node:assert';
import { test } from 'node:test';
import {
  checkDebugAccess,
  DbmsDebugClient,
  type DebugConnection,
  namespacesForExt,
  parseBreakpointTarget,
} from '../../dbmsDebug';

function makeConn(
  executeImpl: (
    sql: string,
    binds?: Record<string, unknown>,
  ) => Promise<{ rows?: unknown[]; outBinds?: Record<string, unknown> }>,
) {
  const calls: { sql: string; binds?: Record<string, unknown> }[] = [];
  const conn: DebugConnection = {
    execute: async (sql: string, binds?: Record<string, unknown>) => {
      calls.push({ sql, binds });
      return executeImpl(sql, binds);
    },
    close: async () => {},
  };
  return { conn, calls };
}

test('dbmsDebugClient: debugOn usa INITIALIZE + DEBUG_ON e retorna session id', async () => {
  const { conn, calls } = makeConn(async () => ({ outBinds: { session: 'SESS-XYZ' } }));
  const client = new DbmsDebugClient(conn);
  assert.strictEqual(await client.debugOn(), 'SESS-XYZ');
  assert.ok(calls[0].sql.includes('DBMS_DEBUG.INITIALIZE'));
  assert.ok(calls[0].sql.includes('DBMS_DEBUG.DEBUG_ON'));
  // DEBUG_ON é procedure: não pode ser usado como função.
  assert.ok(!/v_id\s*:=\s*DBMS_DEBUG\.DEBUG_ON/.test(calls[0].sql));
});

test('dbmsDebugClient: debugOn sem outBinds retorna vazio', async () => {
  const { conn } = makeConn(async () => ({}));
  const client = new DbmsDebugClient(conn);
  assert.strictEqual(await client.debugOn(), '');
});

test('dbmsDebugClient: setBreakpoint usa program_info e retorna o id', async () => {
  const { conn, calls } = makeConn(async () => ({ outBinds: { brkpt: 42 } }));
  const client = new DbmsDebugClient(conn);
  const id = await client.setBreakpoint({ owner: 'APP', unit: 'PKG', line: 5 });
  assert.strictEqual(id, 42);
  assert.ok(calls[0].sql.includes('DBMS_DEBUG.program_info'));
  assert.ok(calls[0].sql.includes('DBMS_DEBUG.SET_BREAKPOINT'));
});

test('dbmsDebugClient: setBreakpoint tenta o próximo namespace quando o primeiro falha', async () => {
  const { conn, calls } = makeConn(async (_sql, binds) => {
    if (binds?.ns === 'toplevel') return { outBinds: { brkpt: 0 } };
    return { outBinds: { brkpt: 7 } };
  });
  const client = new DbmsDebugClient(conn);
  const id = await client.setBreakpoint({
    owner: 'S',
    unit: 'F',
    line: 3,
    namespaces: ['toplevel', 'pkg_body'],
  });
  assert.strictEqual(id, 7);
  assert.deepStrictEqual(
    calls.map((c) => c.binds?.ns),
    ['toplevel', 'pkg_body'],
  );
});

test('dbmsDebugClient: setBreakpoint sem id retorna -1', async () => {
  const { conn } = makeConn(async () => ({}));
  const client = new DbmsDebugClient(conn);
  assert.strictEqual(await client.setBreakpoint({ owner: 'A', unit: 'B', line: 1 }), -1);
});

test('dbmsDebugClient: deleteBreakpoint retorna status', async () => {
  const { conn, calls } = makeConn(async () => ({ outBinds: { status: 0 } }));
  const client = new DbmsDebugClient(conn);
  assert.strictEqual(await client.deleteBreakpoint(7), 0);
  assert.ok(calls[0].sql.includes('DELETE_BREAKPOINT'));
});

test('dbmsDebugClient: continue/step usam CONTINUE e mapeiam a parada', async () => {
  const { conn, calls } = makeConn(async () => ({
    outBinds: { status: 0, stopped: 1, ended: 0, line: 10, unit: 'APP.CALC' },
  }));
  const client = new DbmsDebugClient(conn);
  assert.strictEqual(await client.continueRun(), 'break');
  assert.strictEqual(await client.stepInto(), 'break');
  assert.strictEqual(await client.stepOver(), 'break');
  assert.strictEqual(await client.stepOut(), 'break');
  // Não existe STEP_INTO/STEP_OVER/STEP_OUT: tudo é CONTINUE com breakflags.
  assert.ok(calls.every((c) => c.sql.includes('DBMS_DEBUG.CONTINUE')));
  assert.ok(calls.every((c) => !/DBMS_DEBUG\.STEP_/.test(c.sql)));
  const actions = calls.map((c) => c.binds?.action);
  assert.deepStrictEqual(actions, ['continue', 'into', 'over', 'out']);
});

test('dbmsDebugClient: run com ended=1 vira exiting', async () => {
  const { conn } = makeConn(async () => ({ outBinds: { status: 0, stopped: 0, ended: 1 } }));
  const client = new DbmsDebugClient(conn);
  assert.strictEqual(await client.stepOver(), 'exiting');
});

test('dbmsDebugClient: run sem evento vira no_break; status de erro vira unknown', async () => {
  const ok = makeConn(async () => ({ outBinds: { status: 0, stopped: 0, ended: 0 } }));
  assert.strictEqual(await new DbmsDebugClient(ok.conn).continueRun(), 'no_break');
  const err = makeConn(async () => ({ outBinds: { status: 1, stopped: 0, ended: 0 } }));
  assert.strictEqual(await new DbmsDebugClient(err.conn).continueRun(), 'unknown');
});

test('dbmsDebugClient: reason_exception/handler vira exception; senão break', async () => {
  const exc = makeConn(async () => ({
    outBinds: { status: 0, stopped: 1, ended: 0, isException: 1 },
  }));
  assert.strictEqual(await new DbmsDebugClient(exc.conn).continueRun(), 'exception');
  const brk = makeConn(async () => ({
    outBinds: { status: 0, stopped: 1, ended: 0, isException: 0 },
  }));
  assert.strictEqual(await new DbmsDebugClient(brk.conn).continueRun(), 'break');
});

test('dbmsDebugClient: getRuntimeFrame cai para anonymous em erro', async () => {
  const { conn } = makeConn(async () => {
    throw new Error('boom');
  });
  const client = new DbmsDebugClient(conn);
  assert.deepStrictEqual(await client.getRuntimeFrame(1), {
    name: 'anonymous',
    line: 1,
    frameId: 1,
  });
});

test('dbmsDebugClient: getRuntimeFrame usa o último frame do CONTINUE', async () => {
  const { conn } = makeConn(async () => ({
    outBinds: { status: 0, stopped: 1, ended: 0, line: 10, unit: 'APP.CALC' },
  }));
  const client = new DbmsDebugClient(conn);
  await client.stepOver();
  assert.deepStrictEqual(await client.getRuntimeFrame(1), {
    name: 'APP.CALC',
    line: 10,
    frameId: 1,
  });
});

test('dbmsDebugClient: getRuntimeFrame sem frame prévio consulta GET_RUNTIME_INFO', async () => {
  const { conn, calls } = makeConn(async () => ({ outBinds: { line: 7, unit: 'S.P' } }));
  const client = new DbmsDebugClient(conn);
  assert.deepStrictEqual(await client.getRuntimeFrame(3), { name: 'S.P', line: 7, frameId: 3 });
  assert.ok(calls[0].sql.includes('GET_RUNTIME_INFO'));
});

test('dbmsDebugClient: getRuntimeFrame sem outBinds usa anonymous/1', async () => {
  const { conn } = makeConn(async () => ({}));
  const client = new DbmsDebugClient(conn);
  assert.deepStrictEqual(await client.getRuntimeFrame(3), {
    name: 'anonymous',
    line: 1,
    frameId: 3,
  });
});

test('dbmsDebugClient: getVariables consulta GET_VALUE por nome', async () => {
  const { conn, calls } = makeConn(async () => ({ outBinds: { value: '1' } }));
  const client = new DbmsDebugClient(conn);
  const vars = await client.getVariables(['x', 'y']);
  assert.strictEqual(vars.length, 2);
  assert.deepStrictEqual(vars[0], { name: 'x', value: '1', type: '' });
  assert.ok(calls.every((c) => c.sql.includes('DBMS_DEBUG.GET_VALUE')));
  assert.ok(!calls.some((c) => /GET_VALUES/.test(c.sql)));
});

test('dbmsDebugClient: getVariables sem nomes retorna vazio', async () => {
  const { conn } = makeConn(async () => ({}));
  const client = new DbmsDebugClient(conn);
  assert.deepStrictEqual(await client.getVariables(), []);
});

test('dbmsDebugClient: getVariables ignora nome com erro (sem debug info)', async () => {
  let call = 0;
  const { conn } = makeConn(async () => {
    call++;
    if (call === 1) throw new Error('ORA-01337');
    return { outBinds: { value: 'ok' } };
  });
  const client = new DbmsDebugClient(conn);
  assert.deepStrictEqual(await client.getVariables(['bad', 'good']), [
    { name: 'good', value: 'ok', type: '' },
  ]);
});

test('dbmsDebugClient: attachSession ok retorna true; erro retorna false', async () => {
  let fail = false;
  const { conn, calls } = makeConn(async () => {
    if (fail) throw new Error('ORA-00001');
    return {};
  });
  const client = new DbmsDebugClient(conn);
  assert.strictEqual(await client.attachSession('S', 30), true);
  assert.ok(calls[0].sql.includes('ATTACH_SESSION'));
  fail = true;
  assert.strictEqual(await client.attachSession('S', 30), false);
});

test('checkDebugAccess: reflete os grants reais', async () => {
  const granted = await checkDebugAccess({
    execute: async () => ({ rows: [{ N: 1 }] }),
    close: async () => {},
  });
  assert.strictEqual(granted, true);

  const none = await checkDebugAccess({
    execute: async () => ({ rows: [{ N: 0 }] }),
    close: async () => {},
  });
  assert.strictEqual(none, false);

  const denied = await checkDebugAccess({
    execute: async () => {
      throw new Error('ORA-00942');
    },
    close: async () => {},
  });
  assert.strictEqual(denied, false);
});

test('parseBreakpointTarget: extrai owner/unit (maiúsculos) do caminho', () => {
  const t = parseBreakpointTarget('/ws/install/packages/test_app.pkb', 'DEV');
  assert.deepStrictEqual(t, {
    owner: 'DEV',
    unit: 'TEST_APP',
    line: 0,
    namespaces: ['pkg_body'],
    sourcePath: '/ws/install/packages/test_app.pkb',
  });
});

test('parseBreakpointTarget: extensão desconhecida mantém o nome', () => {
  const t = parseBreakpointTarget('/x/foo.txt', 'S');
  assert.strictEqual(t.unit, 'FOO.TXT');
  assert.deepStrictEqual(t.namespaces, ['toplevel', 'pkg_body', 'trigger']);
});

test('namespacesForExt: top-level para .fnc/.prc, trigger para .trg, todos para .sql', () => {
  assert.deepStrictEqual(namespacesForExt('.fnc'), ['toplevel']);
  assert.deepStrictEqual(namespacesForExt('.PRC'), ['toplevel']);
  assert.deepStrictEqual(namespacesForExt('.trg'), ['trigger']);
  assert.deepStrictEqual(namespacesForExt('.pks'), ['pkg_body']);
  assert.deepStrictEqual(namespacesForExt('.pkb'), ['pkg_body']);
  assert.deepStrictEqual(namespacesForExt('.sql'), ['toplevel', 'pkg_body', 'trigger']);
});
