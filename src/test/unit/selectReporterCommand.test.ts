import './setup.js';
import assert from 'node:assert';
import { mock, test } from 'node:test';
import {
  __getLastQuickPickItems,
  __resetConfigValues,
  __resetLastQuickPickItems,
  __setQuickPickResult,
  commands,
} from '../vscode-stub';

// O comando `utplsql.selectReporter` consome `listReportersOracle` (que devolve
// nomes sem prefixo de schema) e guarda o selecionado na sessão. Este arquivo
// isola o cenário (mock.module só intercepta o primeiro registro do specifier).

let reporterRows: unknown[] = [];
const conn = {
  execute: async (sql: string) => {
    if (/get_reporters_list/i.test(sql)) return { rows: reporterRows };
    return { rows: [] };
  },
  close: async () => {},
};
const pool = { getConnection: async () => conn, close: async () => {} };
const fakeOracledb = {
  OUT_FORMAT_OBJECT: { id: 'object' },
  createPool: async () => pool,
  getConnection: async () => conn,
};
mock.module('oracledb', { namedExports: fakeOracledb });

function makeDeps(selected: string[]) {
  return {
    state: { setExtraReporter: (name: string) => selected.push(name) },
  };
}

test('selectReporter: exibe nomes sem prefixo e guarda o reporter selecionado', async () => {
  __resetConfigValues();
  commands.__resetRegisteredCommands();
  __resetLastQuickPickItems();
  reporterRows = [['UT3.UT_DOCUMENTATION_REPORTER'], ['UT3.UT_COVERAGE_COBERTURA_REPORTER']];
  const orig = process.env.UTPLSQL_CONN;
  process.env.UTPLSQL_CONN = 'u/p@//h:1521/s';
  const selected: string[] = [];
  const { registerConnectionCommands } = await import('../../commands/connection.js');
  const { closeOraclePool } = await import('../../oracleRunner.js');
  try {
    registerConnectionCommands(
      { subscriptions: [] } as never,
      { state: makeDeps(selected).state } as never,
    );
    const handler = commands.__getRegisteredCommand('utplsql.selectReporter');
    assert.ok(handler, 'comando utplsql.selectReporter deveria estar registrado');

    __setQuickPickResult('UT_COVERAGE_COBERTURA_REPORTER');
    await handler?.();

    assert.deepStrictEqual(__getLastQuickPickItems(), [
      'UT_DOCUMENTATION_REPORTER',
      'UT_COVERAGE_COBERTURA_REPORTER',
    ]);
    assert.deepStrictEqual(selected, ['UT_COVERAGE_COBERTURA_REPORTER']);
  } finally {
    process.env.UTPLSQL_CONN = orig;
    await closeOraclePool();
  }
});

test('selectReporter: lista vazia não abre QuickPick nem registra reporter', async () => {
  __resetConfigValues();
  commands.__resetRegisteredCommands();
  __resetLastQuickPickItems();
  reporterRows = [];
  const orig = process.env.UTPLSQL_CONN;
  process.env.UTPLSQL_CONN = 'u/p@//h:1521/s';
  const selected: string[] = [];
  const { registerConnectionCommands } = await import('../../commands/connection.js');
  const { closeOraclePool } = await import('../../oracleRunner.js');
  try {
    registerConnectionCommands(
      { subscriptions: [] } as never,
      { state: makeDeps(selected).state } as never,
    );
    const handler = commands.__getRegisteredCommand('utplsql.selectReporter');
    __setQuickPickResult('IGNORED');
    await handler?.();

    assert.strictEqual(__getLastQuickPickItems(), undefined);
    assert.deepStrictEqual(selected, []);
  } finally {
    process.env.UTPLSQL_CONN = orig;
    await closeOraclePool();
  }
});
