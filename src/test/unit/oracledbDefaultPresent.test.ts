import './setup.js';
import assert from 'node:assert';
import { mock, test } from 'node:test';
import { __resetConfigValues, __setQuickPickResult, commands } from '../vscode-stub';

// Simula um módulo com export default: `mod.default ?? mod` usa o default.
// Cobre os ramos de fallback em commands/connection.ts (selectReporter/showInfo).

const conn = {
  execute: async (sql: string) =>
    /get_reporters_list/i.test(sql) ? { rows: [['UT3.UT_DOCUMENTATION_REPORTER']] } : { rows: [] },
  close: async () => {},
};
const pool = { getConnection: async () => conn, close: async () => {} };
const driver = {
  OUT_FORMAT_OBJECT: {},
  createPool: async () => pool,
  getConnection: async () => conn,
};

mock.module('oracledb', { namedExports: {}, defaultExport: driver });

test('connection: selectReporter/showInfo usam o export default do oracledb', async () => {
  __resetConfigValues();
  commands.__resetRegisteredCommands();
  const orig = process.env.UTPLSQL_CONN;
  process.env.UTPLSQL_CONN = 'u/p@//h:1521/s';
  try {
    const { registerConnectionCommands } = await import('../../commands/connection.js');
    const { closeOraclePool } = await import('../../oracleRunner.js');
    const selected: string[] = [];
    registerConnectionCommands(
      { subscriptions: [] } as never,
      { state: { setExtraReporter: (n: string) => selected.push(n) } } as never,
    );

    __setQuickPickResult('UT_DOCUMENTATION_REPORTER');
    await commands.__getRegisteredCommand('utplsql.selectReporter')?.();
    assert.deepStrictEqual(selected, ['UT_DOCUMENTATION_REPORTER']);

    await commands.__getRegisteredCommand('utplsql.showInfo')?.();
    await closeOraclePool();
  } finally {
    if (orig === undefined) delete process.env.UTPLSQL_CONN;
    else process.env.UTPLSQL_CONN = orig;
    __resetConfigValues();
  }
});
