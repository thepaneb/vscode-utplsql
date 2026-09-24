import './setup.js';
import assert from 'node:assert';
import { mock, test } from 'node:test';
import {
  __getClipboardText,
  __getLastQuickPickItems,
  __resetConfigValues,
  __resetLastQuickPickItems,
  __setInformationResult,
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

test('clearConnection: limpa a sessão e marca context desconectado', async () => {
  __resetConfigValues();
  commands.__resetRegisteredCommands();
  commands.__resetExecutedCommands();
  const { registerConnectionCommands } = await import('../../commands/connection.js');
  registerConnectionCommands(
    { subscriptions: [] } as never,
    { state: makeDeps([]).state } as never,
  );
  const handler = commands.__getRegisteredCommand('utplsql.clearConnection');
  assert.ok(handler, 'comando utplsql.clearConnection deveria estar registrado');
  handler?.();

  assert.ok(
    commands.__getExecutedCommands().includes('setContext'),
    'clearSessionConnection deveria setar utplsql:connected=false',
  );
});

test('configureConnection: abre as settings de conexão', async () => {
  __resetConfigValues();
  commands.__resetRegisteredCommands();
  commands.__resetExecutedCommands();
  const { registerConnectionCommands } = await import('../../commands/connection.js');
  registerConnectionCommands(
    { subscriptions: [] } as never,
    { state: makeDeps([]).state } as never,
  );
  await commands.__getRegisteredCommand('utplsql.configureConnection')?.();
  assert.ok(
    commands.__getExecutedCommands().includes('workbench.action.openSettings'),
    'deveria abrir as settings',
  );
});

test('showInfo: sem conexão mostra erro e não lança', async () => {
  __resetConfigValues();
  commands.__resetRegisteredCommands();
  const orig = process.env.UTPLSQL_CONN;
  delete process.env.UTPLSQL_CONN;
  const { clearSessionConnection } = await import('../../config.js');
  clearSessionConnection();
  try {
    const { registerConnectionCommands } = await import('../../commands/connection.js');
    registerConnectionCommands(
      { subscriptions: [] } as never,
      { state: makeDeps([]).state } as never,
    );
    await assert.doesNotReject(
      () => commands.__getRegisteredCommand('utplsql.showInfo')?.() as Promise<void>,
    );
  } finally {
    process.env.UTPLSQL_CONN = orig;
    __resetConfigValues();
  }
});

test('showInfo: consulta versões via conexão mockada sem lançar', async () => {
  __resetConfigValues();
  commands.__resetRegisteredCommands();
  const orig = process.env.UTPLSQL_CONN;
  process.env.UTPLSQL_CONN = 'u/p@//h:1521/s';
  const { registerConnectionCommands } = await import('../../commands/connection.js');
  const { closeOraclePool } = await import('../../oracleRunner.js');
  try {
    registerConnectionCommands(
      { subscriptions: [] } as never,
      { state: makeDeps([]).state } as never,
    );
    const handler = commands.__getRegisteredCommand('utplsql.showInfo');
    assert.ok(handler, 'comando utplsql.showInfo deveria estar registrado');
    await handler?.();
  } finally {
    process.env.UTPLSQL_CONN = orig;
    await closeOraclePool();
  }
});

test('selectReporter: sem conexão retorna sem abrir QuickPick', async () => {
  __resetConfigValues();
  commands.__resetRegisteredCommands();
  __resetLastQuickPickItems();
  const orig = process.env.UTPLSQL_CONN;
  delete process.env.UTPLSQL_CONN;
  const { clearSessionConnection } = await import('../../config.js');
  clearSessionConnection();
  try {
    const { registerConnectionCommands } = await import('../../commands/connection.js');
    registerConnectionCommands(
      { subscriptions: [] } as never,
      { state: makeDeps([]).state } as never,
    );
    __setQuickPickResult('IGNORED');
    await commands.__getRegisteredCommand('utplsql.selectReporter')?.();
    assert.strictEqual(__getLastQuickPickItems(), undefined);
  } finally {
    if (orig !== undefined) process.env.UTPLSQL_CONN = orig;
    __resetConfigValues();
  }
});

test('showInfo: aceitar copiar escreve a mensagem no clipboard', async () => {
  __resetConfigValues();
  commands.__resetRegisteredCommands();
  const orig = process.env.UTPLSQL_CONN;
  process.env.UTPLSQL_CONN = 'u/p@//h:1521/s';
  const { registerConnectionCommands } = await import('../../commands/connection.js');
  const { closeOraclePool } = await import('../../oracleRunner.js');
  try {
    registerConnectionCommands(
      { subscriptions: [] } as never,
      { state: makeDeps([]).state } as never,
    );
    __setInformationResult('Copiar');
    await commands.__getRegisteredCommand('utplsql.showInfo')?.();
    assert.ok(__getClipboardText().includes('utPLSQL:'));
  } finally {
    __setInformationResult(undefined);
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
