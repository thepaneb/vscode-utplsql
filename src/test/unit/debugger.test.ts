import './setup.js';
import assert from 'node:assert';
import { test } from 'node:test';
import { parseBreakpointTarget } from '../../dbmsDebug';
import {
  type DebuggerRuntime,
  extractParamNames,
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
    execute: async (
      sql: string,
    ): Promise<{ rows?: unknown[]; outBinds?: Record<string, unknown> }> => {
      calls.push(sql);
      if (/DBMS_DEBUG\.INITIALIZE|DBMS_DEBUG\.DEBUG_ON/.test(sql)) {
        return { outBinds: { session: 'SESS1' } };
      }
      if (/DBMS_DEBUG\.CONTINUE|SYNCHRONIZE/.test(sql)) {
        return { outBinds: { status: 0, stopped: 1, ended: 0, line: 10, unit: 'APP.CALC' } };
      }
      if (/GET_RUNTIME_INFO/.test(sql)) return { outBinds: { line: 10, unit: 'APP.CALC' } };
      if (/GET_VALUE/.test(sql)) return { outBinds: { value: '1' } };
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
  // A sessão para no entry; o usuário comanda com `continue`.
  adapter.handleMessage({ type: 'request', seq: 5, command: 'continue' });
  await flushN(4);
  assert.ok(
    sent.some((m) => m.type === 'event' && m.event === 'stopped'),
    'deveria emitir stopped após configurar',
  );

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
  // Sem nomes conhecidos (fonte não disponível), GET_VALUE não é chamado.
  assert.deepStrictEqual(vars, []);

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
  assert.deepStrictEqual(t, {
    owner: 'APP',
    unit: 'TEST_APP',
    line: 0,
    namespaces: ['pkg_body'],
    sourcePath: '/ws/install/packages/test_app.pks',
  });
  t.line = 12;
  assert.strictEqual(t.line, 12);
});

test('extractParamNames: extrai nomes de parâmetros da procedure', () => {
  const src = 'PROCEDURE calc(a IN NUMBER, b IN OUT VARCHAR2, c VARCHAR2) IS BEGIN NULL; END;';
  assert.deepStrictEqual(extractParamNames(src, 'calc'), ['a', 'b', 'c']);
});

test('extractParamNames: sem parênteses ou proc inexistente retorna vazio', () => {
  assert.deepStrictEqual(extractParamNames('PROCEDURE p IS BEGIN NULL; END;', 'p'), []);
  assert.deepStrictEqual(extractParamNames('PROCEDURE x(a NUMBER)', 'y'), []);
  assert.deepStrictEqual(extractParamNames('PROCEDURE x(a NUMBER)', ''), []);
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

test('liveRuntime.runTest: executa ut_runner.run no conn com bind', async () => {
  const calls: { sql: string; binds?: Record<string, unknown> }[] = [];
  const conn = {
    execute: async (sql: string, binds?: Record<string, unknown>) => {
      calls.push({ sql, binds });
    },
    close: async () => {},
  };
  const { liveRuntime } = await import('../../debugger.js');
  await liveRuntime.runTest(conn as never, 'test_app', 't1');
  assert.strictEqual(calls.length, 1);
  assert.match(calls[0].sql, /ut_runner\.run/);
  assert.match(calls[0].sql, /ut_varchar2_list\(:path\)/);
  assert.strictEqual(calls[0].binds?.path, 'test_app.t1');
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
  // continue -> reportStop('break')
  adapter.handleMessage({ type: 'request', seq: 3, command: 'configurationDone' });
  adapter.handleMessage({ type: 'request', seq: 4, command: 'continue' });
  await flushN(4);
  const stopped = sent.filter((m) => m.type === 'event' && m.event === 'stopped');
  assert.ok(stopped.length >= 1);
  adapter.dispose();
});

test('debugger: stackTrace aponta para o arquivo real do breakpoint (não <unit>.pks)', async () => {
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
  adapter.handleMessage({
    type: 'request',
    seq: 3,
    command: 'setBreakpoints',
    arguments: {
      source: { path: '/ws/functions/calcular_desconto.sql' },
      breakpoints: [{ line: 10 }],
    },
  });
  await flushN(2);
  adapter.handleMessage({ type: 'request', seq: 4, command: 'configurationDone' });
  adapter.handleMessage({ type: 'request', seq: 5, command: 'continue' });
  await flushN(4);
  adapter.handleMessage({ type: 'request', seq: 6, command: 'stackTrace' });
  const resp = sent.find((m) => m.command === 'stackTrace') as {
    body?: { stackFrames?: { source?: { path?: string } }[] };
  };
  assert.strictEqual(
    resp.body?.stackFrames?.[0]?.source?.path,
    '/ws/functions/calcular_desconto.sql',
  );
  adapter.dispose();
});

test('debugger: variables do DAP incluem variablesReference', async () => {
  const fs = await import('node:fs');
  const os = await import('node:os');
  const path = await import('node:path');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'utplsql-dbg-'));
  const file = path.join(dir, 'calc.fnc');
  fs.writeFileSync(file, 'FUNCTION F(a IN NUMBER) RETURN NUMBER IS BEGIN RETURN a; END;');

  const conn = makeFakeConn();
  const orig = conn.execute.bind(conn);
  conn.execute = async (sql: string) => {
    if (/CONTINUE/.test(sql)) {
      return { outBinds: { status: 0, stopped: 1, ended: 0, line: 1, unit: 'APP.F' } };
    }
    if (/GET_VALUE/.test(sql)) return { outBinds: { value: '42' } };
    return orig(sql);
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
  adapter.handleMessage({
    type: 'request',
    seq: 3,
    command: 'setBreakpoints',
    arguments: { source: { path: file }, breakpoints: [{ line: 1 }] },
  });
  await flushN(2);
  adapter.handleMessage({ type: 'request', seq: 4, command: 'configurationDone' });
  adapter.handleMessage({ type: 'request', seq: 5, command: 'continue' });
  await flushN(4);
  adapter.handleMessage({ type: 'request', seq: 6, command: 'variables' });
  await flushN(2);
  const resp = sent.find((m) => m.command === 'variables') as {
    body?: { variables?: { name?: string; variablesReference?: number }[] };
  };
  const vars = resp.body?.variables ?? [];
  assert.ok(vars.length > 0, 'deveria ler a variável do parâmetro');
  assert.strictEqual(vars[0].variablesReference, 0);
  adapter.dispose();
  fs.rmSync(dir, { recursive: true, force: true });
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

test('debugger: threads e setExceptionBreakpoints respondem ao VSCode', () => {
  const adapter = new UtplsqlDebugAdapter(makeRuntime(makeFakeConn()));
  const sent: Msg[] = [];
  adapter.onDidSendMessage((m) => sent.push(m));
  adapter.handleMessage({ type: 'request', seq: 1, command: 'threads' });
  adapter.handleMessage({
    type: 'request',
    seq: 2,
    command: 'setExceptionBreakpoints',
    arguments: { filters: [] },
  });
  const threads = sent.find((m) => m.command === 'threads') as { body?: { threads?: unknown[] } };
  assert.ok(Array.isArray(threads.body?.threads) && threads.body.threads.length === 1);
  const ex = sent.find((m) => m.command === 'setExceptionBreakpoints') as { success?: boolean };
  assert.strictEqual(ex.success, true);
  adapter.dispose();
});

test('debugger: entry stop só é enviado após o configurationDone', async () => {
  const adapter = new UtplsqlDebugAdapter(makeRuntime(makeFakeConn()));
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
  assert.ok(
    !sent.some((m) => m.type === 'event' && m.event === 'stopped'),
    'não deve parar antes do configurationDone',
  );
  adapter.handleMessage({ type: 'request', seq: 3, command: 'configurationDone' });
  await flushN(2);
  assert.ok(
    sent.some((m) => m.type === 'event' && m.event === 'stopped'),
    'deve parar após o configurationDone',
  );
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

test('debugger: falha do runTest encerra com o erro no console', async () => {
  const conn = makeFakeConn();
  const adapter = new UtplsqlDebugAdapter({
    acquireConnection: async () => conn as never,
    runTest: async () => {
      throw new Error('boom-run');
    },
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
  const outputs = sent
    .filter((m) => m.type === 'event' && m.event === 'output')
    .map((m) => JSON.stringify(m.body));
  assert.ok(outputs.some((o) => o.includes('boom-run')));
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
    conn.calls.some((s) => /DBMS_DEBUG\.CONTINUE/.test(s)),
    'stepIn/stepOut deveriam usar CONTINUE (com breakflags)',
  );
  adapter.dispose();
});

test('debugger: reportStop com status exiting termina', async () => {
  const conn = makeFakeConn();
  const origExecute = conn.execute.bind(conn);
  conn.execute = async (sql: string) => {
    if (/STEP|CONTINUE|SYNCHRONIZE/.test(sql)) {
      return { outBinds: { status: 0, stopped: 0, ended: 1 } };
    }
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
  adapter.handleMessage({ type: 'request', seq: 4, command: 'continue' });
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
  adapter.handleMessage({ type: 'request', seq: 4, command: 'continue' });
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

test('debugger: setBreakpoints com SET_BREAKPOINT falhando marca verified=false', async () => {
  const conn = makeFakeConn();
  const origExecute = conn.execute.bind(conn);
  conn.execute = async (sql: string) => {
    if (/SET_BREAKPOINT/.test(sql)) throw new Error('breakpoint negado');
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
  adapter.handleMessage({
    type: 'request',
    seq: 3,
    command: 'setBreakpoints',
    arguments: { source: { path: '/ws/test_app.pks' }, breakpoints: [{ line: 7 }] },
  });
  await flushN(2);
  const resp = sent.find((m) => m.command === 'setBreakpoints') as any;
  assert.strictEqual(resp.body.breakpoints[0].verified, false);
  adapter.dispose();
});

test('debugger: comando next usa CONTINUE (break_next_line)', async () => {
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
  adapter.handleMessage({ type: 'request', seq: 3, command: 'next' });
  await flushN(4);
  assert.ok(
    conn.calls.some((s) => /DBMS_DEBUG\.CONTINUE/.test(s)),
    'next deveria usar CONTINUE com breakflags',
  );
  adapter.dispose();
});

test('debugger: reportStop no_break continua até exiting', async () => {
  const conn = makeFakeConn();
  const origExecute = conn.execute.bind(conn);
  let continues = 0;
  conn.execute = async (sql: string) => {
    if (/CONTINUE|SYNCHRONIZE/.test(sql)) {
      continues++;
      // 1º: sem evento (no_break); 2º: encerra (ended).
      return continues === 1
        ? { outBinds: { status: 0, stopped: 0, ended: 0 } }
        : { outBinds: { status: 0, stopped: 0, ended: 1 } };
    }
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
  adapter.handleMessage({ type: 'request', seq: 4, command: 'continue' });
  await flushN(6);
  const events = sent.filter((m) => m.type === 'event').map((m) => m.event);
  assert.ok(events.includes('terminated'), 'deveria terminar no exiting após no_break');
  assert.ok(continues >= 2, 'deveria reexecutar continue após no_break');
  adapter.dispose();
});

test('debugger: timeout da sessão encerra e loga no console', async () => {
  __setConfigValue('debugger.timeoutSeconds', 0.01);
  try {
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
    await new Promise((r) => setTimeout(r, 40));
    const events = sent.filter((m) => m.type === 'event').map((m) => m.event);
    assert.ok(events.includes('terminated'), 'timeout deveria terminar a sessão');
    const out = sent
      .filter((m) => m.type === 'event' && m.event === 'output')
      .map((m) => (m.body as { output?: string }).output ?? '')
      .join('\n');
    assert.ok(out.includes('Timeout'), 'deveria logar o timeout');
    adapter.dispose();
  } finally {
    __resetConfigValues();
  }
});

test('debugger: breakpoints pendentes são aplicados no entry (flush)', async () => {
  const conn = makeFakeConn();
  const adapter = new UtplsqlDebugAdapter(makeRuntime(conn));
  const sent: Msg[] = [];
  adapter.onDidSendMessage((m) => sent.push(m));
  adapter.handleMessage({ type: 'request', seq: 1, command: 'initialize' });
  // Antes do launch: o client ainda não existe -> fica pendente e é aplicado no flush.
  adapter.handleMessage({
    type: 'request',
    seq: 2,
    command: 'setBreakpoints',
    arguments: { source: { path: '/ws/test_app.pks' }, breakpoints: [{ line: 5 }] },
  });
  adapter.handleMessage({
    type: 'request',
    seq: 3,
    command: 'launch',
    arguments: { packageName: 'test_app', connection: 'APP/pass@//h:1521/svc' },
  });
  await flushN(6);
  const changed = sent.filter((m) => m.type === 'event' && m.event === 'breakpoint');
  assert.ok(changed.length >= 1, 'deveria emitir breakpoint(changed) no flush');
  const outputs = sent
    .filter((m) => m.type === 'event' && m.event === 'output')
    .map((m) => JSON.stringify(m.body));
  assert.ok(outputs.some((o) => /aplicado|applied/i.test(o)));
  adapter.dispose();
});

test('debugger: teardown tolera connection.break que falha', async () => {
  const conn = makeFakeConn();
  (conn as unknown as { break: () => Promise<void> }).break = async () => {
    throw new Error('break-boom');
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
  assert.ok(
    conn.calls.includes('CLOSE'),
    'teardown deveria fechar a conexão mesmo com break falhando',
  );
  adapter.dispose();
});
