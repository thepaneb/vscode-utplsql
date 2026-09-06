import './setup.js';
import assert from 'node:assert';
import { test } from 'node:test';
import { parseBreakpointTarget, parseProceedStatus } from '../../dbmsDebug';
import { type DebuggerRuntime, UtplsqlDebugAdapter } from '../../debugger';

const flush = () => new Promise((r) => setTimeout(r, 0));
const flushN = async (n: number) => {
  for (let i = 0; i < n; i++) await flush();
};

function makeFakeConn() {
  const calls: string[] = [];
  const conn = {
    calls,
    execute: async (sql: string) => {
      calls.push(sql);
      if (/DBMS_DEBUG\.DEBUG_ON/.test(sql)) return { outBinds: { session: 'SESS1' } };
      if (/SYNCHRONIZE|DBMS_DEBUG\.CONTINUE|STEP_(INTO|OVER|OUT)/.test(sql)) {
        return { outBinds: { status: 2 } }; // BREAK
      }
      if (/GET_RUNTIME_INFO/.test(sql)) return { outBinds: { name: 'APP.CALC', line: 10 } };
      if (/GET_VALUES/.test(sql)) {
        return {
          rows: [
            ['x', '1', 'NUMBER'],
            ['y', 'foo', 'VARCHAR2'],
          ],
        };
      }
      if (/SET_BREAKPOINT/.test(sql)) return { outBinds: { brkpt: 42 } };
      if (/ATTACH_SESSION|DETACH_SESSION|DEBUG_OFF|DELETE_BREAKPOINT/.test(sql)) return {};
      return {};
    },
    close: async () => {
      calls.push('CLOSE');
    },
  };
  return conn;
}

function makeRuntime(conn: ReturnType<typeof makeFakeConn>): DebuggerRuntime {
  return {
    acquireConnection: async () => conn as never,
    runTest: async () => {
      conn.calls.push('RUN_TEST');
    },
  };
}

interface Msg {
  type: string;
  event?: string;
  command?: string;
  request_seq?: number;
  body?: unknown;
}

test('debugger: ciclo launch -> breakpoint -> stack/scopes/variables -> disconnect', async () => {
  const conn = makeFakeConn();
  const adapter = new UtplsqlDebugAdapter(makeRuntime(conn));
  const sent: Msg[] = [];
  adapter.onDidSendMessage((m) => sent.push(m));

  adapter.handleMessage({ type: 'request', seq: 1, command: 'initialize' });
  adapter.handleMessage({
    type: 'request',
    seq: 2,
    command: 'launch',
    arguments: { packageName: 'test_app', connection: 'APP/pass@//h:1521/svc' },
  });
  await flushN(4);

  const events = sent.filter((m) => m.type === 'event').map((m) => m.event);
  assert.ok(events.includes('initialized'));
  assert.ok(events.includes('stopped'), 'deveria emitir stopped após anexar');
  assert.ok(conn.calls.some((s) => /DBMS_DEBUG\.DEBUG_ON/.test(s)));
  assert.ok(conn.calls.some((s) => /ATTACH_SESSION/.test(s)));

  adapter.handleMessage({
    type: 'request',
    seq: 3,
    command: 'setBreakpoints',
    arguments: { source: { path: '/ws/test_app.pks' }, breakpoints: [{ line: 5 }] },
  });
  await flushN(2);
  const bpResp = sent.find((m) => m.type === 'response' && m.command === 'setBreakpoints');
  const bpBody = bpResp?.body as { breakpoints?: { verified: boolean }[] } | undefined;
  assert.ok(bpBody?.breakpoints);
  assert.strictEqual(bpBody.breakpoints[0].verified, true);

  adapter.handleMessage({ type: 'request', seq: 4, command: 'configurationDone' });
  await flushN(4);

  adapter.handleMessage({ type: 'request', seq: 5, command: 'stackTrace' });
  const stResp = sent.find((m) => m.type === 'response' && m.command === 'stackTrace');
  const frames = (stResp?.body as { stackFrames?: { name: string; line: number }[] } | undefined)
    ?.stackFrames;
  assert.strictEqual(frames?.[0]?.name, 'APP.CALC');
  assert.strictEqual(frames?.[0]?.line, 10);

  adapter.handleMessage({ type: 'request', seq: 6, command: 'scopes' });
  const scResp = sent.find((m) => m.type === 'response' && m.command === 'scopes');
  const scopes = (scResp?.body as { scopes?: { name: string }[] } | undefined)?.scopes;
  assert.strictEqual(scopes?.[0]?.name, 'Locals');

  adapter.handleMessage({ type: 'request', seq: 7, command: 'variables' });
  await flushN(2);
  const varResp = sent.find((m) => m.type === 'response' && m.command === 'variables');
  const vars = (varResp?.body as { variables?: { name: string; value: string }[] } | undefined)
    ?.variables;
  assert.deepStrictEqual(
    vars?.map((v) => [v.name, v.value]),
    [
      ['x', '1'],
      ['y', 'foo'],
    ],
  );

  adapter.handleMessage({ type: 'request', seq: 8, command: 'disconnect' });
  await flushN(3);
  assert.ok(conn.calls.some((s) => /DETACH_SESSION/.test(s)));
  assert.ok(conn.calls.some((s) => /DEBUG_OFF/.test(s)));
  assert.ok(conn.calls.includes('CLOSE'));

  adapter.dispose();
});

test('debugger: sem oracledb/conexao envia terminated', async () => {
  const runtime: DebuggerRuntime = {
    acquireConnection: async () => undefined,
    runTest: async () => {},
  };
  const adapter = new UtplsqlDebugAdapter(runtime);
  const sent: Msg[] = [];
  adapter.onDidSendMessage((m) => sent.push(m));

  adapter.handleMessage({ type: 'request', seq: 1, command: 'initialize' });
  adapter.handleMessage({
    type: 'request',
    seq: 2,
    command: 'launch',
    arguments: { packageName: 'test_app' },
  });
  await flushN(4);

  const events = sent.filter((m) => m.type === 'event').map((m) => m.event);
  assert.ok(events.includes('terminated'), 'deveria encerrar sem conexão');
  const output = sent
    .filter((m) => m.type === 'event' && m.event === 'output')
    .map((m) => (m.body as { output?: string }).output ?? '')
    .join('\n');
  assert.ok(String(output).includes('oracledb'), 'mensagem deveria orientar a instalar oracledb');

  adapter.dispose();
});

test('debugger: pause nao suportado responde erro', () => {
  const adapter = new UtplsqlDebugAdapter({
    acquireConnection: async () => undefined,
    runTest: async () => {},
  });
  const sent: Msg[] = [];
  adapter.onDidSendMessage((m) => sent.push(m));
  adapter.handleMessage({ type: 'request', seq: 1, command: 'pause' });
  const resp = sent.find((m) => m.type === 'response' && m.command === 'pause');
  assert.strictEqual(
    (resp?.body as { message?: string })?.message,
    'Pause não suportado pelo DBMS_DEBUG.',
  );
  adapter.dispose();
});

test('debugger: ATTACH_SESSION falha emite output com grants', async () => {
  const calls: string[] = [];
  const conn = {
    execute: async (sql: string) => {
      calls.push(sql);
      if (/DBMS_DEBUG\.DEBUG_ON/.test(sql)) return { outBinds: { session: 'SESS1' } };
      if (/ATTACH_SESSION/.test(sql)) throw new Error('ORA-06553');
      return {};
    },
    close: async () => {},
  };
  const runtime: DebuggerRuntime = {
    acquireConnection: async () => conn as never,
    runTest: async () => {},
  };
  const adapter = new UtplsqlDebugAdapter(runtime);
  const sent: Msg[] = [];
  adapter.onDidSendMessage((m) => sent.push(m));

  adapter.handleMessage({ type: 'request', seq: 1, command: 'initialize' });
  adapter.handleMessage({
    type: 'request',
    seq: 2,
    command: 'launch',
    arguments: { packageName: 'test_app', connection: 'UT3/pass@//h:1521/svc' },
  });
  await flushN(5);

  const events = sent.filter((m) => m.type === 'event').map((m) => m.event);
  assert.ok(events.includes('terminated'), 'deveria encerrar quando o attach falha');
  const output = sent
    .filter((m) => m.type === 'event' && m.event === 'output')
    .map((m) => (m.body as { output?: string }).output ?? '')
    .join('\n');
  assert.ok(String(output).includes('DBMS_DEBUG'), 'deveria citar o DBMS_DEBUG');
  assert.ok(
    String(output).includes('GRANT EXECUTE ON SYS.DBMS_DEBUG'),
    'deveria oferecer o grant SQL',
  );
  adapter.dispose();
});

// ── dbmsDebug: helpers puros ─────────────────────────────────────────

test('parseBreakpointTarget: deriva owner/unit/linha do caminho', () => {
  const t = parseBreakpointTarget('/ws/install/packages/test_app.pks', 'APP');
  assert.deepStrictEqual(t, { owner: 'APP', unit: 'test_app', line: 0 });
  t.line = 12;
  assert.strictEqual(t.line, 12);
});

test('parseProceedStatus: traduz codigos DBMS_DEBUG', () => {
  assert.strictEqual(parseProceedStatus(2), 'break');
  assert.strictEqual(parseProceedStatus(1), 'no_break');
  assert.strictEqual(parseProceedStatus(5), 'exiting');
  assert.strictEqual(parseProceedStatus(4), 'killed');
  assert.strictEqual(parseProceedStatus(99), 'unknown');
});
