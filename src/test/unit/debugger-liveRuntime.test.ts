import './setup.js';
import assert from 'node:assert';
import { mock, test } from 'node:test';
import { __resetConfigValues, __setConfigValue } from '../vscode-stub';

const executeCalls: Array<{ sql: string; binds?: Record<string, unknown> }> = [];
const connection = {
  callTimeout: 123,
  execute: async (sql: string, binds?: Record<string, unknown>) => {
    executeCalls.push({ sql, binds });
    // Descoberta do utPLSQL resolve o pacote em outro schema (shared install).
    if (/all_synonyms|union all/i.test(sql)) return { rows: [{ TABLE_OWNER: 'UT3' }] };
    return { rows: [] };
  },
  close: async () => {},
};

let connectionOptions: unknown;
const driver = {
  BIND_OUT: 3003,
  STRING: 'STRING',
  NUMBER: 'NUMBER',
  getConnection: async (options: unknown) => {
    connectionOptions = options;
    return connection;
  },
};

mock.module('oracledb', { namedExports: driver, defaultExport: driver });

test('liveRuntime: acquireConnection usa conexão dedicada sem call timeout', async () => {
  __setConfigValue('connection', 'APP/pass@//host:1521/service');
  try {
    const { liveRuntime } = await import('../../debugger.js');
    const acquired = await liveRuntime.acquireConnection();

    assert.strictEqual(acquired, connection);
    assert.strictEqual(connection.callTimeout, 0);
    assert.deepStrictEqual(connectionOptions, {
      user: 'APP',
      password: 'pass',
      connectionString: '//host:1521/service',
    });
  } finally {
    __resetConfigValues();
  }
});

test('liveRuntime.runTest: aceita package e package.test', async () => {
  const { liveRuntime } = await import('../../debugger.js');

  await liveRuntime.runTest(connection as never, 'test_app');
  await liveRuntime.runTest(connection as never, 'test_app', 't1');

  const runCalls = executeCalls.filter((call) => /ut_runner\.run/.test(call.sql));
  assert.strictEqual(runCalls.length, 2);
  assert.deepStrictEqual(
    runCalls.map((call) => call.binds?.path),
    ['test_app', 'test_app.t1'],
  );
  assert.ok(runCalls.every((call) => /UT3\.ut_runner\.run/.test(call.sql)));
  assert.ok(runCalls.every((call) => /UT3\.ut_varchar2_list\(:path\)/.test(call.sql)));
  assert.ok(runCalls.every((call) => /UT3\.ut_reporters\(\)/.test(call.sql)));
});
