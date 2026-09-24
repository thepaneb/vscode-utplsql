import './setup.js';
import assert from 'node:assert';
import { mock, test } from 'node:test';
import type { CommandDeps } from '../../commands/deps';
import { TestStateManager } from '../../state';
import { __resetMessages, commands, TestItem, Uri } from '../vscode-stub';

// Cobre o caminho de execução de `commands/run.ts` (runWithProgress) com
// `executeRun` e `refreshCompilationDiagnostics` mockados — sem banco nem
// TestRun real. As guardas ficam em runCommands.test.ts.

const executeCalls: unknown[][] = [];
let refreshCalled = 0;

mock.module('../../runner.js', {
  namedExports: {
    collectRunTargets: () => ({ leafTests: [], pathArgs: new Set<string>(), suiteCount: 0 }),
    executeRun: async (...args: unknown[]) => {
      executeCalls.push(args);
    },
  },
});

mock.module('../../compilationDiagnostics.js', {
  namedExports: {
    refreshCompilationDiagnostics: async () => {
      refreshCalled += 1;
    },
  },
});

function stateWithSuite() {
  const state = new TestStateManager();
  const suiteItem = new TestItem('suite:pkg') as never;
  const testItem = new TestItem('test:pkg.proc') as never;
  // `TestItemCollection` real itera como pares [id, item].
  (suiteItem as { children: unknown[] }).children = [['test:pkg.proc', testItem]];
  const uri = {
    fsPath: '/tmp/proj/db/PKG/t.pks',
    path: '/tmp/proj/db/PKG/t.pks',
    scheme: 'file',
    toString: () => '/tmp/proj/db/PKG/t.pks',
  };
  const folder = { uri: { fsPath: '/tmp/proj/db/PKG' }, name: 'PKG', index: 0 };
  state.setMeta(suiteItem, { kind: 'suite', packageName: 'PKG', uri, folder } as never);
  state.setMeta(testItem, {
    kind: 'test',
    packageName: 'PKG',
    procName: 'PROC',
    description: 'PROC',
    uri,
    folder,
  } as never);
  state.setSuiteItem('suite:pkg', suiteItem);
  state.cachedItems.push(suiteItem);
  return { state, suiteItem, testItem };
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
  executeCalls.length = 0;
  refreshCalled = 0;
  const { registerRunCommands } = await import('../../commands/run.js');
  const run = registerRunCommands({ subscriptions: [] } as never, makeDeps(state));
  return {
    call: (name: string, ...args: unknown[]) =>
      commands.__getRegisteredCommand(name)?.(...args) as Promise<unknown>,
    run,
  };
}

test('runAll: dispara executeRun sem cobertura', async () => {
  const { state } = stateWithSuite();
  const { call } = await register(state);
  await call('utplsql.runAll');
  assert.strictEqual(executeCalls.length, 1);
  assert.strictEqual(executeCalls[0][3], false);
  assert.strictEqual(refreshCalled, 1);
});

test('runFile: encontra a suite pelo basename do arquivo', async () => {
  const { state } = stateWithSuite();
  const { call } = await register(state);
  await call('utplsql.runFile', Uri.file('/tmp/proj/db/PKG/t.pks'));
  assert.strictEqual(executeCalls.length, 1);
  assert.strictEqual(executeCalls[0][3], false);
});

test('runFileCoverage: executa com cobertura', async () => {
  const { state } = stateWithSuite();
  const { call } = await register(state);
  await call('utplsql.runFileCoverage', Uri.file('/tmp/proj/db/PKG/t.pks'));
  assert.strictEqual(executeCalls.length, 1);
  assert.strictEqual(executeCalls[0][3], true);
});

test('runFolder: encontra a suite pela pasta', async () => {
  const { state } = stateWithSuite();
  const { call } = await register(state);
  await call('utplsql.runFolder', Uri.file('/tmp/proj/db/PKG'));
  assert.strictEqual(executeCalls.length, 1);
  assert.strictEqual(executeCalls[0][3], false);
});

test('runFolderCoverage: executa com cobertura', async () => {
  const { state } = stateWithSuite();
  const { call } = await register(state);
  await call('utplsql.runFolderCoverage', Uri.file('/tmp/proj/db/PKG'));
  assert.strictEqual(executeCalls.length, 1);
  assert.strictEqual(executeCalls[0][3], true);
});

test('runLens: teste específico é resolvido pelo procName', async () => {
  const { state } = stateWithSuite();
  const { call } = await register(state);
  await call('utplsql.runLens', {
    type: 'test',
    packageName: 'PKG',
    procName: 'PROC',
    uri: 'file:///tmp/proj/db/PKG/t.pks',
  });
  assert.strictEqual(executeCalls.length, 1);
});

test('rerunLast: última execução de teste reexecuta o teste', async () => {
  const { state } = stateWithSuite();
  state.setLastRun({
    type: 'test',
    packageName: 'PKG',
    procName: 'PROC',
    coverage: false,
  });
  const { call } = await register(state);
  await call('utplsql.rerunLast');
  assert.strictEqual(executeCalls.length, 1);
});

test('runFailed: reexecuta os itens que falharam', async () => {
  const { state, testItem } = stateWithSuite();
  state.setLastFailedItems([testItem]);
  const { call } = await register(state);
  await call('utplsql.runFailed');
  assert.strictEqual(executeCalls.length, 1);
});

test('cancel: o cancelador devolvido não lança sem execução ativa', async () => {
  const { state } = stateWithSuite();
  const { run } = await register(state);
  assert.doesNotThrow(() => run.cancel());
});
