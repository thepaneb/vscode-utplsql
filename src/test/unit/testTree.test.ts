import './setup.js';
import assert from 'node:assert';
import { test } from 'node:test';
import type { SuiteFile } from '../../discovery';
import { TestStateManager } from '../../state';
import {
  buildFileTree,
  buildSchemaTree,
  collectAllItems,
  createRefresher,
  type MergeDbDeps,
  mergeDbSuites,
} from '../../testTree';
import { __resetConfigValues, __setConfigValue, workspace } from '../vscode-stub';

function makeItem(id: string, uri?: unknown) {
  const children: any[] = [];
  return {
    id,
    uri,
    range: undefined as unknown,
    children: {
      add(c: any) {
        children.push(c);
      },
      forEach(cb: (c: any, i: number) => void) {
        children.forEach(cb);
      },
      get size() {
        return children.length;
      },
      [Symbol.iterator]() {
        return children.map((c) => [c.id, c] as [string, any])[Symbol.iterator]();
      },
    },
    _children: children,
  };
}

function makeController() {
  const items: any[] = [];
  return {
    createTestItem: (id: string, _label: string, uri?: unknown) => makeItem(id, uri),
    items: {
      add(i: any) {
        items.push(i);
      },
      replace() {
        items.length = 0;
      },
      forEach(cb: (i: any) => void) {
        items.forEach(cb);
      },
      get: (id: string) => items.find((i) => i.id === id),
    },
    _items: items,
  } as any;
}

function suite(over: Partial<SuiteFile>): SuiteFile {
  const folder = {
    uri: { fsPath: '/ws', path: '/ws', scheme: 'file' },
    name: 'ws',
    index: 0,
  } as any;
  return {
    uri: { fsPath: '/ws/ut_app.pks', path: '/ws/ut_app.pks', scheme: 'file' } as any,
    packageName: 'UT_APP',
    suiteDescription: 'App tests',
    tests: [
      { procName: 'test_one', description: 'one', line: 10 },
      { procName: 'test_two', description: 'two', line: 20 },
    ],
    folder,
    suiteLine: 1,
    ...over,
  } as SuiteFile;
}

test('buildFileTree: cria suite + testes, meta e suiteMap', () => {
  const controller = makeController();
  const state = new TestStateManager();
  buildFileTree(controller, state, [suite({})]);

  assert.strictEqual(controller._items.length, 1);
  const suiteItem = controller._items[0];
  assert.strictEqual(suiteItem.id, 'suite:ut_app');
  assert.strictEqual(suiteItem._children.length, 2);
  assert.strictEqual(state.getMeta(suiteItem)?.kind, 'suite');
  assert.strictEqual(state.getMeta(suiteItem._children[0])?.kind, 'test');
  assert.strictEqual(state.getSuiteItem('suite:ut_app'), suiteItem);
  assert.strictEqual(state.cachedItems.length, 1);
  assert.strictEqual(state.getItem('test:ut_app.test_one'), suiteItem._children[0]);
});

test('buildFileTree: displayName tem prioridade sobre description', () => {
  const controller = makeController();
  const state = new TestStateManager();
  buildFileTree(controller, state, [
    suite({
      tests: [{ procName: 'p', description: 'raw', displayName: 'Bonito', line: 5 }],
    }),
  ]);
  const meta = state.getMeta(controller._items[0]._children[0]);
  assert.ok(meta && meta.kind === 'test');
  assert.strictEqual(meta.description, 'Bonito');
});

test('buildSchemaTree: agrupa em Schema > Package > Suite > Test', () => {
  const controller = makeController();
  const state = new TestStateManager();
  buildSchemaTree(
    controller,
    state,
    [suite({ dbSchema: 'APP' }), suite({ dbSchema: 'APP', packageName: 'UT_OTHER' })],
    'db/{schema}/**',
  );

  assert.strictEqual(controller._items.length, 1);
  const schemaItem = controller._items[0];
  assert.strictEqual(schemaItem.id, 'schema:APP');
  const pkgItems = schemaItem._children;
  assert.strictEqual(pkgItems.length, 2);
  assert.ok(pkgItems.every((p: any) => p.id.startsWith('package:APP:')));
  // suites aninhadas ficam acessíveis via state.suiteMap
  assert.ok(state.getSuiteItem('suite:ut_app'));
  assert.ok(state.getSuiteItem('suite:ut_other'));
});

test('buildSchemaTree: schema desconhecido vai para UNKNOWN por último', () => {
  const controller = makeController();
  const state = new TestStateManager();
  buildSchemaTree(
    controller,
    state,
    [
      suite({ dbSchema: 'APP' }),
      suite({ dbSchema: undefined, uri: { fsPath: '/ws/outro/x.pks', scheme: 'file' } as any }),
    ],
    'db/{schema}/**',
  );
  const ids = controller._items.map((i: any) => i.id);
  assert.deepStrictEqual(ids, ['schema:APP', 'schema:UNKNOWN']);
});

test('buildSchemaTree: ordena schemas alfabéticos com UNKNOWN por último', () => {
  const controller = makeController();
  const state = new TestStateManager();
  buildSchemaTree(
    controller,
    state,
    [
      suite({ dbSchema: undefined, uri: { fsPath: '/ws/z.pks', scheme: 'file' } as any }),
      suite({ dbSchema: 'ZZZ' }),
      suite({ dbSchema: 'APP' }),
    ],
    'db/{schema}/**',
  );
  assert.deepStrictEqual(
    controller._items.map((i: any) => i.id),
    ['schema:APP', 'schema:ZZZ', 'schema:UNKNOWN'],
  );
});

test('createRefresher: modo schema sem conexão monta árvore vazia (merge early-return)', async () => {
  const controller = makeController();
  const state = new TestStateManager();
  const origEnv = process.env.UTPLSQL_CONN;
  delete process.env.UTPLSQL_CONN;
  __resetConfigValues();
  __setConfigValue('organization', 'schema');
  workspace.__setWorkspaceFolders([{ uri: { fsPath: '/ws' }, name: 'ws', index: 0 }] as never);
  try {
    const refresh = createRefresher(controller, state);
    await refresh();
    assert.strictEqual(controller._items.length, 0);
  } finally {
    process.env.UTPLSQL_CONN = origEnv;
    __resetConfigValues();
    workspace.__setWorkspaceFolders(undefined);
  }
});

test('collectAllItems: usa cachedItems quando já populado', () => {
  const controller = makeController();
  const state = new TestStateManager();
  buildFileTree(controller, state, [suite({})]);
  const items = collectAllItems(controller, state);
  assert.strictEqual(items.length, 1);
});

test('collectAllItems: percorre até 3 níveis quando cache vazio', () => {
  const controller = makeController();
  const state = new TestStateManager();
  const schema = makeItem('schema:APP');
  const pkg = makeItem('package:APP:P');
  const suiteItem = makeItem('suite:p');
  pkg.children.add(suiteItem);
  schema.children.add(pkg);
  controller.items.add(schema);

  const items = collectAllItems(controller, state);
  assert.strictEqual(items.length, 3);
});

test('createRefresher: coalesce chamadas concorrentes e substitui a árvore', async () => {
  const controller = makeController();
  const state = new TestStateManager();
  const refresh = createRefresher(controller, state);

  // Duas chamadas simultâneas: a segunda espera a primeira e dispara um novo run.
  await Promise.all([refresh(), refresh()]);

  assert.strictEqual(controller._items.length, 0);
  assert.strictEqual(state.cachedItems.length, 0);
});

test('createRefresher: 3 chamadas concorrentes — as excedentes retornam sem novo run', async () => {
  const controller = makeController();
  const state = new TestStateManager();
  const refresh = createRefresher(controller, state);

  await Promise.all([refresh(), refresh(), refresh()]);

  assert.strictEqual(controller._items.length, 0);
  assert.strictEqual(state.cachedItems.length, 0);
});

// ── mergeDbSuites (injeção de dependências) ─────────────────────────

function mergeDeps(over: Partial<MergeDbDeps> = {}): MergeDbDeps {
  return {
    resolveConnection: () => 'u/p@//h:1521/s',
    extractSchemaFromPath: () => undefined,
    discoverSchemasFromFolders: async () => [],
    discoverDbSuites: async () => [],
    ...over,
  };
}

test('mergeDbSuites: sem conexão não busca suites do banco', async () => {
  const suites = [suite({})];
  let discovered = 0;
  await mergeDbSuites(
    suites,
    [],
    'db/{schema}/**',
    mergeDeps({
      resolveConnection: () => undefined,
      discoverSchemasFromFolders: async () => {
        discovered++;
        return ['APP'];
      },
    }),
  );
  assert.strictEqual(discovered, 0);
  assert.strictEqual(suites.length, 1);
});

test('mergeDbSuites: une schemas do path e das pastas e mescla sem duplicar', async () => {
  const suites = [suite({ packageName: 'UT_APP' })];
  const onlyDb = suite({ packageName: 'UT_NEW', dbSchema: 'APP' });
  const duplicate = suite({ packageName: 'ut_app', dbSchema: 'APP' });
  const seen: string[] = [];

  await mergeDbSuites(
    suites,
    [{ uri: { fsPath: '/ws' }, name: 'ws', index: 0 }] as never,
    'db/{schema}/**',
    mergeDeps({
      extractSchemaFromPath: () => 'APP',
      discoverSchemasFromFolders: async () => ['OTHER'],
      discoverDbSuites: async (_conn, schema) => {
        seen.push(schema);
        return schema === 'APP' ? [duplicate, onlyDb] : [];
      },
    }),
  );

  assert.deepStrictEqual(seen.sort(), ['APP', 'OTHER']);
  assert.strictEqual(suites.length, 2);
  assert.ok(suites.some((s) => s.packageName === 'UT_NEW'));
  assert.ok(!suites.some((s) => s.packageName === 'ut_app'));
});

test('mergeDbSuites: várias suites só-DB do mesmo schema entram na ordem', async () => {
  const suites: SuiteFile[] = [];
  await mergeDbSuites(
    suites,
    [],
    'db/{schema}/**',
    mergeDeps({
      discoverSchemasFromFolders: async () => ['APP'],
      discoverDbSuites: async () => [
        suite({ packageName: 'UT_B' }),
        suite({ packageName: 'UT_A' }),
      ],
    }),
  );
  assert.deepStrictEqual(
    suites.map((s) => s.packageName),
    ['UT_B', 'UT_A'],
  );
});
