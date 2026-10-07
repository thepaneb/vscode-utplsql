import './setup.js';
import assert from 'node:assert';
import { mock, test } from 'node:test';
import type { CommandDeps } from '../../commands/deps';
import { TestStateManager } from '../../state';
import {
  __getInformationMessages,
  __getLastQuickPickItems,
  __getWarningMessages,
  __resetLastQuickPickItems,
  __resetMessages,
  __resetQuickPickResults,
  __setQuickPickResults,
  commands,
  TestItem,
} from '../vscode-stub';

// Cobre `utplsql.runByTag` (PRD-51 RF3) com `runner`/`testTree` mockados —
// sem banco: exercita o QuickPick, o filtro por tag e o caminho de execução.

const executeCalls: unknown[][] = [];
const resolveSubtreeCalls: string[] = [];

mock.module('../../runner.js', {
  namedExports: {
    collectRunTargets: () => ({ leafTests: [], pathArgs: new Set<string>(), suiteCount: 0 }),
    executeRun: async (...args: unknown[]) => {
      executeCalls.push(args);
    },
  },
});

mock.module('../../testTree.js', {
  namedExports: {
    // `collectAllItems` devolve as suites registradas em `cachedItems`.
    collectAllItems: async (_controller: unknown, state: TestStateManager) => state.cachedItems,
    resolveSubtree: async (_c: unknown, _s: unknown, item: { id: string }) => {
      resolveSubtreeCalls.push(item.id);
    },
  },
});

mock.module('../../compilationDiagnostics.js', {
  namedExports: { refreshCompilationDiagnostics: async () => {} },
});

function makeDeps(state: TestStateManager): CommandDeps {
  return {
    controller: { items: { forEach: () => {} } } as never,
    state,
    getStatusBar: () => undefined,
    getDecorationManager: () => undefined,
    refresh: async () => {},
  };
}

interface SuiteOpts {
  tags?: string[];
}

function suite(state: TestStateManager, pkg: string, opts: SuiteOpts = {}) {
  const id = `suite:${pkg.toLowerCase()}`;
  const item = new TestItem(id);
  (item as { children: unknown[] }).children = [];
  state.setMeta(
    item as never,
    {
      kind: 'suite',
      packageName: pkg,
      uri: { fsPath: `/ws/${pkg}.pks` } as never,
      folder: { uri: { fsPath: '/ws' } } as never,
      ...(opts.tags ? { tags: opts.tags } : {}),
    } as never,
  );
  state.setSuiteItem(id, item as never);
  state.setItem(id, item as never);
  state.cachedItems.push(item as never);
  return item;
}

async function register(state: TestStateManager) {
  commands.__resetRegisteredCommands();
  __resetMessages();
  __resetQuickPickResults();
  __resetLastQuickPickItems();
  executeCalls.length = 0;
  resolveSubtreeCalls.length = 0;
  const { registerRunCommands } = await import('../../commands/run.js');
  registerRunCommands({ subscriptions: [] } as never, makeDeps(state));
  return (name: string, ...args: unknown[]) =>
    commands.__getRegisteredCommand(name)?.(...args) as Promise<unknown>;
}

test('runByTag: monta o QuickPick com as tags e contagem', async () => {
  const state = new TestStateManager();
  suite(state, 'UT_A', { tags: ['fast', 'smoke'] });
  suite(state, 'UT_B', { tags: ['fast'] });
  const call = await register(state);
  __setQuickPickResults([[]]); // cancela a seleção

  await call('utplsql.runByTag');

  const items = __getLastQuickPickItems() as Array<{ label: string; description?: string }>;
  assert.ok(items, 'QuickPick deveria ter sido aberto');
  assert.deepStrictEqual(
    items.map((i) => i.label),
    ['#fast', '#smoke'],
  );
  assert.strictEqual(items[0].description, '(2)');
  assert.strictEqual(items[1].description, '(1)');
});

test('runByTag: seleção roda as suites casadas e resolve as subárvores', async () => {
  const state = new TestStateManager();
  const a = suite(state, 'UT_A', { tags: ['fast'] });
  suite(state, 'UT_B', { tags: ['slow'] });
  const call = await register(state);
  __setQuickPickResults([[{ label: '#fast', description: '(1)' }]]);

  await call('utplsql.runByTag');

  assert.strictEqual(executeCalls.length, 1);
  assert.ok(
    resolveSubtreeCalls.includes(a.id),
    `subárvore de ${a.id} deveria ser resolvida: ${resolveSubtreeCalls.join(',')}`,
  );
});

test('runByTag: seleção sem match avisa e não executa', async () => {
  const state = new TestStateManager();
  suite(state, 'UT_A', { tags: ['fast'] });
  const call = await register(state);
  // Label de uma tag que não existe mais (picker obsoleto) → nenhum item casa.
  __setQuickPickResults([[{ label: '#ghost' }]]);

  await call('utplsql.runByTag');

  assert.deepStrictEqual(__getWarningMessages(), [
    'Nenhum teste corresponde às tags selecionadas.',
  ]);
  assert.strictEqual(executeCalls.length, 0);
});

test('runByTag: picker cancelado não executa', async () => {
  const state = new TestStateManager();
  suite(state, 'UT_A', { tags: ['fast'] });
  const call = await register(state);
  __setQuickPickResults([undefined]);

  await call('utplsql.runByTag');

  assert.strictEqual(executeCalls.length, 0);
});

test('runByTag: cobertura segue o modo global (coverageAlways)', async () => {
  const state = new TestStateManager();
  suite(state, 'UT_A', { tags: ['fast'] });
  state.coverageAlways = true;
  state.coverageProfile = { name: 'coverage' } as never;
  const call = await register(state);
  __setQuickPickResults([[{ label: '#fast' }]]);

  await call('utplsql.runByTag');

  assert.strictEqual(executeCalls.length, 1);
  assert.strictEqual(executeCalls[0][3], true, 'coverage deveria ser true');
});

test('runByTag: sem tags disponíveis avisa (não abre picker)', async () => {
  const state = new TestStateManager();
  suite(state, 'UT_A'); // sem tags
  const call = await register(state);
  await call('utplsql.runByTag');
  assert.deepStrictEqual(__getInformationMessages(), ['Nenhuma tag descoberta nas suítes/testes.']);
});
