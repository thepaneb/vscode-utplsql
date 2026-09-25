import './setup.js';
import assert from 'node:assert';
import { mock, test } from 'node:test';
import type { CommandDeps } from '../../commands/deps';
import { type TestLineResult, TestStateManager } from '../../state';
import {
  __cancelProgress,
  __getCancellationTokenSources,
  __getProgressReports,
  __resetCancellationTokenSources,
  __resetMessages,
  commands,
  TestController,
  TestItem,
  TestRunRequest,
  Uri,
} from '../vscode-stub';

// Cobre o caminho de execução de `commands/run.ts` (runWithProgress) com
// `executeRun` e `refreshCompilationDiagnostics` mockados — sem banco nem
// TestRun real. As guardas ficam em runCommands.test.ts.

const executeCalls: unknown[][] = [];
const collectCalls: unknown[][] = [];
let nextSuiteCount = 0;
let executeHook: ((args: unknown[]) => Promise<void> | void) | undefined;
let refreshCalled = 0;
let refreshShouldThrow = false;

mock.module('../../runner.js', {
  namedExports: {
    collectRunTargets: (roots: Iterable<unknown>) => {
      const items = [...roots];
      collectCalls.push(items);
      return { leafTests: [], pathArgs: new Set<string>(), suiteCount: nextSuiteCount };
    },
    executeRun: async (...args: unknown[]) => {
      executeCalls.push(args);
      await executeHook?.(args);
    },
  },
});

mock.module('../../compilationDiagnostics.js', {
  namedExports: {
    refreshCompilationDiagnostics: async () => {
      refreshCalled += 1;
      if (refreshShouldThrow) throw new Error('diagnostic failure');
    },
  },
});

function stateWithSuite() {
  const state = new TestStateManager();
  const suiteItem = new TestItem('suite:pkg');
  const testItem = new TestItem('test:pkg.proc');
  // `TestItemCollection` real itera como pares [id, item].
  (suiteItem as { children: unknown[] }).children = [['test:pkg.proc', testItem]];
  const uri = {
    fsPath: '/tmp/proj/db/PKG/t.pks',
    path: '/tmp/proj/db/PKG/t.pks',
    scheme: 'file',
    toString: () => '/tmp/proj/db/PKG/t.pks',
  };
  const folder = { uri: { fsPath: '/tmp/proj/db/PKG' }, name: 'PKG', index: 0 };
  state.setMeta(suiteItem as never, { kind: 'suite', packageName: 'PKG', uri, folder } as never);
  state.setMeta(
    testItem as never,
    {
      kind: 'test',
      packageName: 'PKG',
      procName: 'PROC',
      description: 'PROC',
      uri,
      folder,
    } as never,
  );
  state.setSuiteItem('suite:pkg', suiteItem as never);
  state.setItem(suiteItem.id, suiteItem as never);
  state.setItem(testItem.id, testItem as never);
  state.runProfile = { name: 'run' } as never;
  state.coverageProfile = { name: 'coverage' } as never;
  state.cachedItems.push(suiteItem as never);
  return { state, suiteItem, testItem };
}

interface DepsOptions {
  controller?: unknown;
  statusBar?: unknown;
  decorationManager?: unknown;
}

function makeDeps(state: TestStateManager, options: DepsOptions = {}): CommandDeps {
  return {
    controller: (options.controller ?? { items: { forEach: () => {} } }) as never,
    state,
    getStatusBar: () => options.statusBar as never,
    getDecorationManager: () => options.decorationManager as never,
    refresh: async () => {},
  };
}

async function register(state: TestStateManager, options: DepsOptions = {}) {
  commands.__resetRegisteredCommands();
  __resetMessages();
  __resetCancellationTokenSources();
  executeCalls.length = 0;
  collectCalls.length = 0;
  nextSuiteCount = 0;
  executeHook = undefined;
  refreshCalled = 0;
  refreshShouldThrow = false;
  const { registerRunCommands } = await import('../../commands/run.js');
  const run = registerRunCommands({ subscriptions: [] } as never, makeDeps(state, options));
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

test('runWithProgress: executa callbacks de suite, resultado e decoração', async () => {
  const { state, suiteItem, testItem } = stateWithSuite();
  const lastResults = new Map<string, TestLineResult>();
  state.setLastResults(lastResults);
  const runningCalls: unknown[][] = [];
  const resultCalls: unknown[][] = [];
  const updateCalls: Array<{ results: unknown; resolved: unknown }> = [];
  const statusBar = {
    showRunning: (...args: unknown[]) => runningCalls.push(args),
    showResults: (...args: unknown[]) => resultCalls.push(args),
  };
  const decorationManager = {
    update: (results: unknown, resolve: (id: string) => unknown) => {
      updateCalls.push({ results, resolved: resolve(testItem.id) });
    },
  };
  const { run } = await register(state, { statusBar, decorationManager });
  const progressReportStart = __getProgressReports().length;
  nextSuiteCount = 2;
  executeHook = (args) => {
    const onSuiteStart = args[5] as (() => void) | undefined;
    const onComplete = args[6] as
      | ((
          passed: number,
          failed: number,
          skipped: number,
          errored: number,
          duration: number,
        ) => void)
      | undefined;
    onSuiteStart?.();
    onSuiteStart?.();
    onComplete?.(3, 1, 2, 0, 321);
  };

  await run.runWithProgress(
    new TestRunRequest([suiteItem], undefined, state.coverageProfile) as never,
    undefined,
    true,
  );

  assert.deepStrictEqual(runningCalls, [
    [1, 2],
    [2, 2],
  ]);
  assert.deepStrictEqual(resultCalls, [[3, 1, 2, 0, 321]]);
  assert.strictEqual(updateCalls.length, 1);
  assert.strictEqual(updateCalls[0].results, lastResults);
  assert.strictEqual(updateCalls[0].resolved, testItem);
  assert.strictEqual(refreshCalled, 1);

  const progressReports = __getProgressReports().slice(progressReportStart) as Array<{
    message?: string;
  }>;
  assert.deepStrictEqual(progressReports.slice(0, 2), [{ message: '1/2' }, { message: '2/2' }]);
  assert.strictEqual(progressReports.length, 3);
  assert.strictEqual(typeof progressReports[2]?.message, 'string');
});

test('runWithProgress: usa controller.items.forEach quando include é indefinido', async () => {
  const { state, suiteItem } = stateWithSuite();
  const controller = new TestController('test.controller', 'Test Controller');
  controller.items.add(suiteItem);
  const { run } = await register(state, { controller });
  nextSuiteCount = 1;

  await run.runWithProgress(
    new TestRunRequest(undefined, undefined, state.runProfile) as never,
    undefined,
    false,
  );

  assert.deepStrictEqual(collectCalls, [[suiteItem]]);
});

test('runWithProgress: token externo cancela a execução e a assinatura é descartada', async () => {
  const { state, suiteItem } = stateWithSuite();
  let externalListener: (() => void) | undefined;
  let externalDisposed = false;
  const externalToken = {
    isCancellationRequested: false,
    onCancellationRequested(listener: () => void) {
      externalListener = () => {
        if (!externalDisposed) listener();
      };
      return {
        dispose: () => {
          externalDisposed = true;
        },
      };
    },
  };
  let receivedToken: { isCancellationRequested: boolean } | undefined;
  const { run } = await register(state);
  executeHook = (args) => {
    receivedToken = args[2] as { isCancellationRequested: boolean };
    externalListener?.();
  };

  await run.runWithProgress(
    new TestRunRequest([suiteItem], undefined, state.runProfile) as never,
    externalToken as never,
    false,
  );

  assert.strictEqual(receivedToken?.isCancellationRequested, true);
  assert.strictEqual(externalDisposed, true);
  const source = __getCancellationTokenSources().find((item) => item.token === receivedToken);
  assert.strictEqual(source?.cancelCount, 1);
  externalListener?.();
  assert.strictEqual(source?.cancelCount, 1);
});

test('runWithProgress: token do withProgress cancela a execução', async () => {
  const { state, suiteItem } = stateWithSuite();
  let receivedToken: { isCancellationRequested: boolean } | undefined;
  const { run } = await register(state);
  executeHook = (args) => {
    receivedToken = args[2] as { isCancellationRequested: boolean };
    __cancelProgress();
  };

  await run.runWithProgress(
    new TestRunRequest([suiteItem], undefined, state.runProfile) as never,
    undefined,
    false,
  );

  assert.strictEqual(receivedToken?.isCancellationRequested, true);
});

test('runWithProgress: descarta a assinatura do progresso ao concluir', async () => {
  const { state, suiteItem } = stateWithSuite();
  let receivedToken: { isCancellationRequested: boolean } | undefined;
  const { run } = await register(state);
  executeHook = (args) => {
    receivedToken = args[2] as { isCancellationRequested: boolean };
  };

  await run.runWithProgress(
    new TestRunRequest([suiteItem], undefined, state.runProfile) as never,
    undefined,
    false,
  );

  assert.strictEqual(receivedToken?.isCancellationRequested, false);
  __cancelProgress();
  assert.strictEqual(receivedToken?.isCancellationRequested, false);
});

test('runWithProgress: cancela a execução ativa e limpa currentRunToken', async (t) => {
  const { state, suiteItem } = stateWithSuite();
  let firstResolve!: () => void;
  let secondResolve!: () => void;
  const firstGate = new Promise<void>((resolve) => {
    firstResolve = resolve;
  });
  const secondGate = new Promise<void>((resolve) => {
    secondResolve = resolve;
  });
  const tokens: Array<{ isCancellationRequested: boolean }> = [];
  const pending: Promise<void>[] = [];
  t.after(async () => {
    firstResolve();
    secondResolve();
    await Promise.allSettled(pending);
  });
  let calls = 0;
  const { call, run } = await register(state);
  executeHook = async (args) => {
    tokens.push(args[2] as { isCancellationRequested: boolean });
    if (calls++ === 0) await firstGate;
    else await secondGate;
  };

  const first = run.runWithProgress(
    new TestRunRequest([suiteItem], undefined, state.runProfile) as never,
    undefined,
    false,
  );
  pending.push(first);
  const second = run.runWithProgress(
    new TestRunRequest([suiteItem], undefined, state.runProfile) as never,
    undefined,
    false,
  );
  pending.push(second);

  assert.strictEqual(tokens.length, 2);
  assert.strictEqual(tokens[0].isCancellationRequested, true);
  assert.strictEqual(tokens[1].isCancellationRequested, false);
  firstResolve();
  await first;
  assert.strictEqual(
    __getCancellationTokenSources().find((item) => item.token === tokens[0])?.isDisposed,
    true,
  );
  assert.strictEqual(tokens[1].isCancellationRequested, false);

  await call('utplsql.cancelRun');
  assert.strictEqual(tokens[1].isCancellationRequested, true);
  secondResolve();
  await second;
  assert.strictEqual(
    __getCancellationTokenSources().find((item) => item.token === tokens[1])?.isDisposed,
    true,
  );

  assert.strictEqual(
    __getCancellationTokenSources().find((item) => item.token === tokens[0])?.cancelCount,
    1,
  );
  assert.strictEqual(
    __getCancellationTokenSources().find((item) => item.token === tokens[1])?.cancelCount,
    1,
  );
});

test('runWithProgress: currentRunToken aponta para a execução mais recente', async (t) => {
  const { state, suiteItem } = stateWithSuite();
  let secondResolve!: () => void;
  const secondGate = new Promise<void>((resolve) => {
    secondResolve = resolve;
  });
  const tokens: Array<{ isCancellationRequested: boolean }> = [];
  const pending: Promise<void>[] = [];
  t.after(async () => {
    secondResolve();
    await Promise.allSettled(pending);
  });
  const { call, run } = await register(state);
  executeHook = async (args) => {
    tokens.push(args[2] as { isCancellationRequested: boolean });
    if (tokens.length === 2) await secondGate;
  };

  const first = run.runWithProgress(
    new TestRunRequest([suiteItem], undefined, state.runProfile) as never,
    undefined,
    false,
  );
  pending.push(first);
  await first;
  const firstSource = __getCancellationTokenSources().find((item) => item.token === tokens[0]);
  assert.strictEqual(tokens[0].isCancellationRequested, false);
  assert.strictEqual(firstSource?.isDisposed, true);
  assert.strictEqual(firstSource?.cancelCount, 0);

  const second = run.runWithProgress(
    new TestRunRequest([suiteItem], undefined, state.runProfile) as never,
    undefined,
    false,
  );
  pending.push(second);
  assert.strictEqual(tokens.length, 2);
  assert.strictEqual(tokens[0].isCancellationRequested, false);
  assert.strictEqual(tokens[1].isCancellationRequested, false);

  await call('utplsql.cancelRun');
  assert.strictEqual(tokens[0].isCancellationRequested, false);
  assert.strictEqual(tokens[1].isCancellationRequested, true);
  secondResolve();
  await second;

  const secondSource = __getCancellationTokenSources().find((item) => item.token === tokens[1]);
  assert.strictEqual(firstSource?.cancelCount, 0);
  assert.strictEqual(secondSource?.cancelCount, 1);
  assert.strictEqual(secondSource?.isDisposed, true);
});

test('runWithProgress: falha de diagnóstico não impede a atualização de decorações', async () => {
  const { state, suiteItem } = stateWithSuite();
  let updateCalls = 0;
  const decorationManager = { update: () => (updateCalls += 1) };
  const { run } = await register(state, { decorationManager });
  refreshShouldThrow = true;

  await run.runWithProgress(
    new TestRunRequest([suiteItem], undefined, state.runProfile) as never,
    undefined,
    false,
  );

  assert.strictEqual(updateCalls, 1);
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

test('runLens: usa o perfil de cobertura para teste específico', async () => {
  const { state } = stateWithSuite();
  const { call } = await register(state);
  await call('utplsql.runLens', {
    type: 'test',
    packageName: 'PKG',
    procName: 'PROC',
    uri: 'file:///tmp/proj/db/PKG/t.pks',
    coverage: true,
  });
  assert.strictEqual(executeCalls.length, 1);
  assert.strictEqual(executeCalls[0][3], true);
  assert.strictEqual((executeCalls[0][1] as TestRunRequest).profile, state.coverageProfile);
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

test('rerunLast: última execução de teste preserva cobertura', async () => {
  const { state } = stateWithSuite();
  state.setLastRun({
    type: 'test',
    packageName: 'PKG',
    procName: 'PROC',
    coverage: true,
  });
  const { call } = await register(state);
  await call('utplsql.rerunLast');
  assert.strictEqual(executeCalls.length, 1);
  assert.strictEqual(executeCalls[0][3], true);
  assert.strictEqual((executeCalls[0][1] as TestRunRequest).profile, state.coverageProfile);
});

test('runFailed: reexecuta os itens que falharam', async () => {
  const { state, testItem } = stateWithSuite();
  state.setLastFailedItems([testItem as never]);
  const { call } = await register(state);
  await call('utplsql.runFailed');
  assert.strictEqual(executeCalls.length, 1);
});

test('cancel: o cancelador devolvido não lança sem execução ativa', async () => {
  const { state } = stateWithSuite();
  const { run } = await register(state);
  assert.doesNotThrow(() => run.cancel());
});
