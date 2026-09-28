import './setup.js';
import assert from 'node:assert';
import { mock, test } from 'node:test';
import type { CommandDeps } from '../../commands/deps';
import { TestStateManager } from '../../state';
import {
  __getErrorMessages,
  __getInformationMessages,
  __getLastSaveDialogOptions,
  __getOutputChannelLines,
  __getWarningMessages,
  __getWrittenFile,
  __resetMessages,
  __resetOutputChannels,
  __resetQuickPickResults,
  __resetWrittenFiles,
  __setQuickPickResults,
  __setSaveDialogResult,
  commands,
  TestItem,
  Uri,
  workspace,
} from '../vscode-stub';

// Cobre o comando `utplsql.runWithReporter` (PRD-76) sem banco: `runner`,
// `testTree`, `oracleRunner` e `compilationDiagnostics` são mockados.

const executeCalls: unknown[][] = [];
let exportText: string | undefined = 'REPORTER OUTPUT';
let executeThrows = false;

mock.module('../../runner.js', {
  namedExports: {
    collectRunTargets: () => ({ leafTests: [], pathArgs: new Set<string>(), suiteCount: 0 }),
    executeRun: async (...args: unknown[]) => {
      executeCalls.push(args);
      if (executeThrows) throw new Error('export boom');
      return exportText;
    },
  },
});

mock.module('../../testTree.js', {
  namedExports: {
    collectAllItems: async () => [],
    resolveSubtree: async () => {},
  },
});

mock.module('../../oracleRunner.js', {
  namedExports: {
    listReportersForConnection: async () => ['ut_documentation_reporter', 'ut_x'],
  },
});

mock.module('../../compilationDiagnostics.js', {
  namedExports: { refreshCompilationDiagnostics: async () => {} },
});

function makeState() {
  const state = new TestStateManager();
  const suiteItem = new TestItem('suite:pkg');
  const folder = { uri: { fsPath: '/ws' }, name: 'ws', index: 0 };
  state.setMeta(
    suiteItem as never,
    {
      kind: 'suite',
      packageName: 'PKG',
      uri: Uri.file('/ws/ut_pkg.pks') as never,
      folder: folder as never,
    } as never,
  );
  state.setSuiteItem('suite:pkg', suiteItem as never);
  state.setItem(suiteItem.id, suiteItem as never);
  state.runProfile = { name: 'run' } as never;
  return { state, suiteItem };
}

function makeDeps(state: TestStateManager): CommandDeps {
  return {
    controller: { items: { forEach: () => {} } } as never,
    state,
    getStatusBar: () => undefined,
    getDecorationManager: () => undefined,
    refresh: async () => {},
  };
}

async function register(state: TestStateManager) {
  commands.__resetRegisteredCommands();
  __resetMessages();
  __resetOutputChannels();
  __resetQuickPickResults();
  __resetWrittenFiles();
  __setSaveDialogResult(undefined);
  executeCalls.length = 0;
  exportText = 'REPORTER OUTPUT';
  executeThrows = false;
  const { registerRunCommands } = await import('../../commands/run.js');
  registerRunCommands({ subscriptions: [] } as never, makeDeps(state));
  return (name: string, ...args: unknown[]) =>
    commands.__getRegisteredCommand(name)?.(...args) as Promise<unknown>;
}

async function withConn(fn: () => Promise<void>): Promise<void> {
  const orig = process.env.UTPLSQL_CONN;
  process.env.UTPLSQL_CONN = 'u/p@//h:1521/s';
  try {
    await fn();
  } finally {
    process.env.UTPLSQL_CONN = orig;
  }
}

test('runWithReporter: exporta para o Output com o reporter escolhido', async () =>
  withConn(async () => {
    const { state, suiteItem } = makeState();
    const call = await register(state);
    __setQuickPickResults(['ut_documentation_reporter', { label: 'Output', value: 'output' }]);

    await call('utplsql.runWithReporter', suiteItem);

    assert.strictEqual(executeCalls.length, 1);
    const exportReporter = executeCalls[0][7] as { name?: string } | undefined;
    assert.strictEqual(exportReporter?.name, 'ut_documentation_reporter');
    const out = __getOutputChannelLines('utPLSQL reporter').join('\n');
    assert.ok(out.includes('REPORTER OUTPUT'), `output inesperado: ${out}`);
  }));

test('runWithReporter: salva em arquivo quando escolhido', async () =>
  withConn(async () => {
    const { state, suiteItem } = makeState();
    workspace.__setWorkspaceFolders([{ uri: { fsPath: '/ws' }, name: 'ws', index: 0 }] as never);
    const call = await register(state);
    __setQuickPickResults(['ut_x', { label: 'File', value: 'file' }]);
    __setSaveDialogResult(Uri.file('/ws/out.xml'));

    try {
      await call('utplsql.runWithReporter', suiteItem);
    } finally {
      workspace.__setWorkspaceFolders(undefined);
    }

    assert.strictEqual(__getWrittenFile('/ws/out.xml'), 'REPORTER OUTPUT');
    const opts = __getLastSaveDialogOptions() as { defaultUri?: { fsPath?: string } } | undefined;
    assert.ok(opts?.defaultUri, 'deveria sugerir um nome de arquivo');
    assert.ok(opts.defaultUri?.fsPath?.includes('utplsql-ut_x-'));
    assert.ok(__getInformationMessages().length >= 1);
  }));

test('runWithReporter: cancelar o QuickPick de reporter não executa', async () =>
  withConn(async () => {
    const { state, suiteItem } = makeState();
    const call = await register(state);
    __setQuickPickResults([undefined]);

    await call('utplsql.runWithReporter', suiteItem);

    assert.strictEqual(executeCalls.length, 0);
  }));

test('runWithReporter: sem alvo avisa e não executa', async () =>
  withConn(async () => {
    const { state } = makeState();
    const call = await register(state);

    await call('utplsql.runWithReporter');

    assert.ok(__getWarningMessages().length >= 1);
    assert.strictEqual(executeCalls.length, 0);
  }));

test('runWithReporter: sem conexão mostra erro', async () => {
  const orig = process.env.UTPLSQL_CONN;
  delete process.env.UTPLSQL_CONN;
  try {
    const { state, suiteItem } = makeState();
    const call = await register(state);
    await call('utplsql.runWithReporter', suiteItem);
    assert.ok(__getErrorMessages().length >= 1);
  } finally {
    process.env.UTPLSQL_CONN = orig;
  }
});

test('runWithReporter: erro do export vira mensagem de erro', async () =>
  withConn(async () => {
    const { state, suiteItem } = makeState();
    const call = await register(state);
    __setQuickPickResults(['ut_x', { label: 'Output', value: 'output' }]);
    executeThrows = true;

    await call('utplsql.runWithReporter', suiteItem);

    assert.ok(__getErrorMessages().some((m) => m.includes('export boom')));
    assert.strictEqual(__getOutputChannelLines('utPLSQL reporter').length, 0);
  }));

test('runWithReporter: saída indefinida (cancelado) não grava', async () =>
  withConn(async () => {
    const { state, suiteItem } = makeState();
    const call = await register(state);
    __setQuickPickResults(['ut_x', { label: 'Output', value: 'output' }]);
    exportText = undefined;

    await call('utplsql.runWithReporter', suiteItem);

    assert.strictEqual(__getOutputChannelLines('utPLSQL reporter').length, 0);
  }));
