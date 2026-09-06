import './setup.js';
import assert from 'node:assert';
import { test } from 'node:test';
import { parseBreakpointTarget, parseProceedStatus } from '../../dbmsDebug';
import {
  type DebuggerRuntime,
  startDebugSession,
  UtplsqlDebugAdapter,
  UtplsqlDebugAdapterDescriptorFactory,
  UtplsqlDebugConfigurationProvider,
} from '../../debugger';
import { __resetConfigValues, __setConfigValue } from '../vscode-stub';

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

// ── registros do debugger (factory / config provider / startDebugSession) ──

test('debugger factory: createDebugAdapterDescriptor retorna adapter inline', () => {
  const desc = new UtplsqlDebugAdapterDescriptorFactory().createDebugAdapterDescriptor({} as never);
  assert.ok(desc, 'deveria retornar um descriptor');
  assert.strictEqual(
    (desc as { _adapter?: unknown })._adapter?.constructor?.name,
    'UtplsqlDebugAdapter',
  );
});

test('debugger config provider: preenche type/request/stopOnException/connection', async () => {
  __setConfigValue('connection', 'user/senha@//h:1521/svc');
  try {
    const provider = new UtplsqlDebugConfigurationProvider();
    const cfg = (await provider.resolveDebugConfiguration(undefined, {} as never)) as Record<
      string,
      unknown
    >;
    assert.strictEqual(cfg.type, 'utplsql');
    assert.strictEqual(cfg.request, 'launch');
    assert.strictEqual(cfg.stopOnException, true);
    assert.strictEqual(cfg.connection, 'user/senha@//h:1521/svc');
  } finally {
    __resetConfigValues();
  }
});

test('startDebugSession: monta config e chama vscode.debug.startDebugging', async () => {
  const { debug } = await import('../vscode-stub.js');
  __setConfigValue('connection', 'user/senha@//h:1521/svc');
  try {
    await startDebugSession('test_app', 't1');
    const started = debug.__getStartedConfigs();
    assert.strictEqual(started.length, 1);
    const cfg = started[0] as Record<string, unknown>;
    assert.strictEqual(cfg.packageName, 'test_app');
    assert.strictEqual(cfg.testName, 't1');
    assert.strictEqual(cfg.type, 'utplsql');
  } finally {
    __resetConfigValues();
  }
});

test('liveRuntime.acquireConnection: sem conexão configurada retorna undefined', async () => {
  __resetConfigValues();
  const { liveRuntime } = await import('../../debugger.js');
  const conn = await liveRuntime.acquireConnection();
  assert.strictEqual(conn, undefined);
});

test('liveRuntime.runTest: executa ut_runner.run no conn', async () => {
  const calls: string[] = [];
  const conn = {
    execute: async (sql: string) => {
      calls.push(sql);
    },
    close: async () => {},
  };
  const { liveRuntime } = await import('../../debugger.js');
  await liveRuntime.runTest(conn as never, 'test_app', 't1');
  assert.strictEqual(calls.length, 1);
  assert.match(calls[0], /ut_runner\.run/);
  assert.match(calls[0], /test_app\.t1/);
});

test('debugger: runTest sem testName usa só o pacote', async () => {
  const conn = makeFakeConn();
  const adapter = new UtplsqlDebugAdapter({
    acquireConnection: async () => conn as never,
    runTest: async (_c, pkg, t) => {
      conn.calls.push(`RUN_TEST:${pkg}${t ? `.${t}` : ''}`);
    },
  });
  adapter.dispose();
});

test('debugger: comandos pause e desconhecidos respondem sucesso false', async () => {
  const adapter = new UtplsqlDebugAdapter(makeRuntime(makeFakeConn()));
  const sent: Msg[] = [];
  adapter.onDidSendMessage((m) => sent.push(m));
  adapter.handleMessage({ type: 'request', seq: 1, command: 'pause' });
  adapter.handleMessage({ type: 'request', seq: 2, command: 'foo' });
  const pause = sent.find((m) => m.command === 'pause') as any;
  const foo = sent.find((m) => m.command === 'foo') as any;
  assert.strictEqual(pause.body.success, false);
  assert.strictEqual(foo.body.success, false);
  adapter.dispose();
});

test('debugger: launch sem connection não configura schema', async () => {
  const conn = makeFakeConn();
  const adapter = new UtplsqlDebugAdapter(makeRuntime(conn));
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
  // Sem connection: schema fica default UT3, mas init ainda roda
  assert.ok(conn.calls.some((s) => /DEBUG_ON/.test(s)));
  adapter.dispose();
});

test('debugger: setBreakpoints antes de anexar guarda alvos não verificados', async () => {
  const conn = makeFakeConn();
  const adapter = new UtplsqlDebugAdapter(makeRuntime(conn));
  const sent: Msg[] = [];
  adapter.onDidSendMessage((m) => sent.push(m));
  // Sem initialize/launch: debuggerClient ainda é undefined
  adapter.handleMessage({
    type: 'request',
    seq: 1,
    command: 'setBreakpoints',
    arguments: { source: { path: '/ws/test_app.pks' }, breakpoints: [{ line: 5 }] },
  });
  await flushN(2);
  const resp = sent.find((m) => m.command === 'setBreakpoints') as any;
  assert.strictEqual(resp.body.breakpoints[0].verified, false);
  adapter.dispose();
});

test('debugger: reportStop com status break atualiza currentFrame e envia stopped', async () => {
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
  // configurationDone dispara continue -> step -> reportStop('break')
  adapter.handleMessage({ type: 'request', seq: 3, command: 'configurationDone' });
  await flushN(4);
  const stopped = sent.filter((m) => m.type === 'event' && m.event === 'stopped');
  assert.ok(stopped.length >= 1);
  adapter.dispose();
});

test('debugger: stackTrace sem currentFrame retorna lista vazia', async () => {
  const adapter = new UtplsqlDebugAdapter(makeRuntime(makeFakeConn()));
  const sent: Msg[] = [];
  adapter.onDidSendMessage((m) => sent.push(m));
  adapter.handleMessage({ type: 'request', seq: 1, command: 'stackTrace' });
  const resp = sent.find((m) => m.command === 'stackTrace') as any;
  assert.deepStrictEqual(resp.body.stackFrames, []);
  assert.strictEqual(resp.body.totalFrames, 0);
  adapter.dispose();
});

test('debugger: initialize expõe flags de suporte', async () => {
  const adapter = new UtplsqlDebugAdapter(makeRuntime(makeFakeConn()));
  const sent: Msg[] = [];
  adapter.onDidSendMessage((m) => sent.push(m));
  adapter.handleMessage({ type: 'request', seq: 1, command: 'initialize' });
  const resp = sent.find((m) => m.command === 'initialize') as any;
  assert.strictEqual(resp.body.supportsConfigurationDoneRequest, true);
  assert.strictEqual(resp.body.supportsTerminateRequest, true);
  adapter.dispose();
});

test('debugger: runtime sem conexão emite terminated e teardown', async () => {
  const adapter = new UtplsqlDebugAdapter({
    acquireConnection: async () => undefined,
    runTest: async () => {},
  });
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
  assert.ok(events.includes('terminated'));
  adapter.dispose();
});

test('debugger: segunda conexão falha emite terminated (debuggerConn undefined)', async () => {
  const conn = makeFakeConn();
  let acquireCount = 0;
  const adapter = new UtplsqlDebugAdapter({
    acquireConnection: async () => {
      acquireCount++;
      return acquireCount <= 1 ? (conn as never) : undefined;
    },
    runTest: async () => {},
  });
  const sent: Msg[] = [];
  adapter.onDidSendMessage((m) => sent.push(m));
  adapter.handleMessage({ type: 'request', seq: 1, command: 'initialize' });
  adapter.handleMessage({
    type: 'request',
    seq: 2,
    command: 'launch',
    arguments: { packageName: 'test_app', connection: 'APP/pass@//h:1521/svc' },
  });
  await flushN(6);
  const events = sent.filter((m) => m.type === 'event').map((m) => m.event);
  assert.ok(events.includes('terminated'));
  assert.ok(events.includes('output'));
  adapter.dispose();
});

test('debugger: attachSession falha emite terminated', async () => {
  const conn = {
    execute: async (sql: string) => {
      if (/DEBUG_ON/.test(sql)) return { outBinds: { session: 'SESS1' } };
      if (/ATTACH_SESSION/.test(sql)) throw new Error('grant ausente');
      return {};
    },
    close: async () => {},
  };
  const adapter = new UtplsqlDebugAdapter(makeRuntime(conn as never));
  const sent: Msg[] = [];
  adapter.onDidSendMessage((m) => sent.push(m));
  adapter.handleMessage({ type: 'request', seq: 1, command: 'initialize' });
  adapter.handleMessage({
    type: 'request',
    seq: 2,
    command: 'launch',
    arguments: { packageName: 'test_app', connection: 'APP/pass@//h:1521/svc' },
  });
  await flushN(6);
  const events = sent.filter((m) => m.type === 'event').map((m) => m.event);
  assert.ok(events.includes('terminated'), 'attachSession false deveria terminar');
  adapter.dispose();
});

test('debugger: setBreakpoints sem source/breakpoints usa fallback', async () => {
  const adapter = new UtplsqlDebugAdapter(makeRuntime(makeFakeConn()));
  const sent: Msg[] = [];
  adapter.onDidSendMessage((m) => sent.push(m));
  adapter.handleMessage({ type: 'request', seq: 1, command: 'setBreakpoints' });
  await flushN(2);
  const resp = sent.find((m) => m.command === 'setBreakpoints') as any;
  assert.ok(resp);
  assert.deepStrictEqual(resp.body.breakpoints, []);
  adapter.dispose();
});

test('debugger: stepIn e stepOut acionam waitForNextStop correspondente', async () => {
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
  adapter.handleMessage({ type: 'request', seq: 3, command: 'stepIn' });
  adapter.handleMessage({ type: 'request', seq: 4, command: 'stepOut' });
  await flushN(4);
  assert.ok(
    conn.calls.some((s) => /STEP_INTO/.test(s)),
    'stepIn deveria chamar STEP_INTO',
  );
  assert.ok(
    conn.calls.some((s) => /STEP_OUT/.test(s)),
    'stepOut deveria chamar STEP_OUT',
  );
  adapter.dispose();
});

test('debugger: reportStop com status exiting termina', async () => {
  const conn = makeFakeConn();
  const origExecute = conn.execute.bind(conn);
  conn.execute = async (sql: string) => {
    if (/STEP|CONTINUE|SYNCHRONIZE/.test(sql)) return { outBinds: { status: 5 } };
    return origExecute(sql);
  };
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
  adapter.handleMessage({ type: 'request', seq: 3, command: 'configurationDone' });
  await flushN(6);
  const events = sent.filter((m) => m.type === 'event').map((m) => m.event);
  assert.ok(events.includes('terminated'), 'status exiting deveria terminar');
  adapter.dispose();
});

test('debugger: step com erro emite stderr e terminated', async () => {
  const conn = makeFakeConn();
  const origExecute = conn.execute.bind(conn);
  conn.execute = async (sql: string) => {
    if (/STEP|CONTINUE|SYNCHRONIZE/.test(sql)) throw new Error('step quebrado');
    return origExecute(sql);
  };
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
  adapter.handleMessage({ type: 'request', seq: 3, command: 'configurationDone' });
  await flushN(6);
  const events = sent.filter((m) => m.type === 'event').map((m) => m.event);
  assert.ok(events.includes('terminated'));
  const errOut = sent.filter((m) => m.type === 'event' && m.event === 'output');
  assert.ok(errOut.length > 0);
  adapter.dispose();
});

test('debugger: variables sem debuggerClient retorna vazio', async () => {
  const adapter = new UtplsqlDebugAdapter(makeRuntime(makeFakeConn()));
  const sent: Msg[] = [];
  adapter.onDidSendMessage((m) => sent.push(m));
  adapter.handleMessage({ type: 'request', seq: 1, command: 'variables' });
  await flushN(2);
  const resp = sent.find((m) => m.command === 'variables') as any;
  assert.deepStrictEqual(resp.body.variables, []);
  adapter.dispose();
});

test('debugger: variables com erro no GET_VALUES retorna vazio', async () => {
  const conn = makeFakeConn();
  const origExecute = conn.execute.bind(conn);
  conn.execute = async (sql: string) => {
    if (/GET_VALUES/.test(sql)) throw new Error('values negado');
    return origExecute(sql);
  };
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
  adapter.handleMessage({ type: 'request', seq: 3, command: 'variables' });
  await flushN(2);
  const resp = sent.find((m) => m.command === 'variables') as any;
  assert.deepStrictEqual(resp.body.variables, []);
  adapter.dispose();
});

test('debugger: teardown ignora erros de detach/debugOff/close', async () => {
  const conn = makeFakeConn();
  const origExecute = conn.execute.bind(conn);
  conn.execute = async (sql: string) => {
    if (/DETACH_SESSION|DEBUG_OFF/.test(sql)) throw new Error('teardown negado');
    return origExecute(sql);
  };
  conn.close = async () => {
    throw new Error('close negado');
  };
  const adapter = new UtplsqlDebugAdapter(makeRuntime(conn));
  adapter.handleMessage({ type: 'request', seq: 1, command: 'initialize' });
  adapter.handleMessage({
    type: 'request',
    seq: 2,
    command: 'launch',
    arguments: { packageName: 'test_app', connection: 'APP/pass@//h:1521/svc' },
  });
  await flushN(4);
  adapter.handleMessage({ type: 'request', seq: 3, command: 'disconnect' });
  await flushN(4);
  adapter.dispose();
});

test('startDebugSession: sem testName monta config sem sufixo', async () => {
  const { debug, __resetConfigValues } = await import('../vscode-stub.js');
  __resetConfigValues();
  await startDebugSession('test_app');
  const cfg = debug.__getStartedConfigs().at(-1) as { name?: string };
  assert.strictEqual(cfg?.name, 'Debug test_app');
});
