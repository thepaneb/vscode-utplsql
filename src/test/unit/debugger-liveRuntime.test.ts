import './setup.js';
import assert from 'node:assert';
import { mock, test } from 'node:test';
import { __resetConfigValues, __setConfigValue } from '../vscode-stub';

const executeCalls: Array<{ sql: string; binds?: Record<string, unknown> }> = [];
const connection = {
  callTimeout: 123,
  execute: async (sql: string, binds?: Record<string, unknown>) => {
    executeCalls.push({ sql, binds });
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

  assert.strictEqual(executeCalls.length, 2);
  assert.deepStrictEqual(
    executeCalls.map((call) => call.binds?.path),
    ['test_app', 'test_app.t1'],
  );
  assert.ok(executeCalls.every((call) => /ut_runner\.run/.test(call.sql)));
});
