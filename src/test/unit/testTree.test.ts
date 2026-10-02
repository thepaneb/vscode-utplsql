import './setup.js';

import assert from 'node:assert';
import { test } from 'node:test';
import type { SuiteFile } from '../../discovery';
import { TestStateManager } from '../../state';
import {
  buildFileTree,
  buildSchemaTree,
  buildTagTree,
  collectAllItems,
  createRefresher,
  type MergeDbDeps,
  mergeDbSuites,
  NO_TAG_GROUP,
  resolvePackageNode,
  resolveSchemaNode,
  resolveSubtree,
  resolveSuiteNode,
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
  const labels = new Map<string, string>();
  return {
    createTestItem: (id: string, label: string, uri?: unknown) => {
      labels.set(id, label);
      return makeItem(id, uri);
    },
    _labels: labels,
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

test('buildFileTree: suprimi tags do label por padrão (showTagsInTree=false)', () => {
  __resetConfigValues();
  const controller = makeController();
  const state = new TestStateManager();
  buildFileTree(controller, state, [
    suite({
      tags: ['smoke'],
      tests: [{ procName: 'test_one', description: 'one', line: 10, tags: ['fast'] }],
    }),
  ]);
  assert.strictEqual(controller._labels.get('suite:ut_app'), 'App tests  (UT_APP)');
  assert.strictEqual(controller._labels.get('test:ut_app.test_one'), 'one');
});

test('buildFileTree: showTagsInTree sufixa o label com as tags (PRD-51 RF4)', () => {
  __setConfigValue('showTagsInTree', true);
  try {
    const controller = makeController();
    const state = new TestStateManager();
    buildFileTree(controller, state, [
      suite({
        tags: ['smoke', 'fast'],
        tests: [{ procName: 'test_one', description: 'one', line: 10, tags: ['critical'] }],
      }),
    ]);
    assert.strictEqual(controller._labels.get('suite:ut_app'), 'App tests  (UT_APP) [smoke, fast]');
    assert.strictEqual(controller._labels.get('test:ut_app.test_one'), 'one [critical]');
  } finally {
    __resetConfigValues();
  }
});

test('buildFileTree: propaga para o ItemMeta as tags de suíte e teste (PRD-51 RF1)', () => {
  const controller = makeController();
  const state = new TestStateManager();
  buildFileTree(controller, state, [
    suite({
      tags: ['smoke'],
      tests: [{ procName: 'test_one', description: 'one', line: 10, tags: ['fast'] }],
    }),
  ]);
  const suiteItem = controller._items[0];
  assert.ok(state.getMeta(suiteItem)?.tags);
  assert.deepStrictEqual(state.getMeta(suiteItem)?.tags, ['smoke']);
  const testMeta = state.getMeta(suiteItem._children[0]);
  assert.ok(testMeta);
  assert.deepStrictEqual(testMeta.tags, ['fast']);
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

// ── PRD-55: árvore por tag ──────────────────────────────────────────────────
test('buildTagTree: agrupa por tag, ordena e cria Tag > Suite > Test', () => {
  const controller = makeController();
  const state = new TestStateManager();
  buildTagTree(controller, state, [
    suite({ packageName: 'UT_B', tags: ['slow'] }),
    suite({ packageName: 'UT_A', tags: ['fast'] }),
  ]);

  const labels = controller._items.map((i: any) => i.id);
  assert.deepStrictEqual(labels, ['tag:fast', 'tag:slow']);
  const fast = controller._items[0];
  assert.strictEqual(fast._children.length, 1);
  const suiteItem = fast._children[0];
  assert.strictEqual(suiteItem.id, 'suite:ut_a#fast');
  assert.strictEqual(suiteItem._children.length, 2);
  assert.strictEqual(state.getMeta(suiteItem)?.kind, 'suite');
  assert.strictEqual(state.getMeta(suiteItem._children[0])?.kind, 'test');
});

test('buildTagTree: suites sem tag vão para "(sem tag)" por último', () => {
  const controller = makeController();
  const state = new TestStateManager();
  buildTagTree(controller, state, [
    suite({ packageName: 'UT_X' }),
    suite({ packageName: 'UT_A', tags: ['fast'] }),
  ]);
  assert.deepStrictEqual(
    controller._items.map((i: any) => i.id),
    ['tag:fast', `tag:${NO_TAG_GROUP}`],
  );
  assert.strictEqual(controller._items[1]._children[0].id, `suite:ut_x#${NO_TAG_GROUP}`);
});

test('buildTagTree: suite com múltiplas tags aparece sob cada tag com id próprio', () => {
  const controller = makeController();
  const state = new TestStateManager();
  buildTagTree(controller, state, [suite({ packageName: 'UT_A', tags: ['fast', 'smoke'] })]);
  assert.deepStrictEqual(
    controller._items.map((i: any) => i.id),
    ['tag:fast', 'tag:smoke'],
  );
  const fastSuite = controller._items[0]._children[0];
  const smokeSuite = controller._items[1]._children[0];
  assert.strictEqual(fastSuite.id, 'suite:ut_a#fast');
  assert.strictEqual(smokeSuite.id, 'suite:ut_a#smoke');
  assert.notStrictEqual(fastSuite.id, smokeSuite.id);
  assert.notStrictEqual(fastSuite._children[0].id, smokeSuite._children[0].id);
});

test('buildTagTree: id canônico aponta para a primeira ocorrência (BR-SCHEMA-005)', () => {
  const controller = makeController();
  const state = new TestStateManager();
  buildTagTree(controller, state, [suite({ packageName: 'UT_A', tags: ['fast', 'smoke'] })]);
  assert.strictEqual(state.getSuiteItem('suite:ut_a'), controller._items[0]._children[0]);
  assert.ok(state.getSuiteFile('suite:ut_a'));
});

test('buildTagTree: itens de teste ficam registrados no itemMap', () => {
  const controller = makeController();
  const state = new TestStateManager();
  buildTagTree(controller, state, [suite({ packageName: 'UT_X' })]);
  const suiteItem = controller._items[0]._children[0];
  const testItem = suiteItem._children[0];
  assert.strictEqual(state.getItem(testItem.id), testItem);
  assert.strictEqual(state.getMeta(testItem)?.kind, 'test');
});

test('buildSchemaTree: cria só os nós de schema (lazy)', () => {
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
  assert.strictEqual(schemaItem._children.length, 0, 'não deve materializar package/suite');
  assert.strictEqual(schemaItem.canResolveChildren, true);
  assert.strictEqual(state.discoveredFiles.length, 2);
});

const lazyDeps = {
  resolveConnection: () => undefined,
  extractSchemaFromPath: () => 'APP',
  discoverDbSuites: async () => [],
};

test('resolvedores: materializam schema → package → suite → teste por nível', async () => {
  const controller = makeController();
  const state = new TestStateManager();
  buildSchemaTree(controller, state, [suite({ dbSchema: 'APP' })], 'db/{schema}/**');
  const schemaItem = controller._items[0];

  await resolveSchemaNode(controller, state, schemaItem, lazyDeps as never);
  assert.strictEqual(schemaItem._children.length, 1);
  const pkgItem = schemaItem._children[0];
  assert.strictEqual(pkgItem.id, 'package:APP:UT_APP');
  assert.strictEqual(pkgItem._children.length, 0);

  resolvePackageNode(controller, state, pkgItem);
  assert.strictEqual(pkgItem._children.length, 1);
  const suiteItem = pkgItem._children[0];
  assert.strictEqual(suiteItem.id, 'suite:ut_app');
  assert.strictEqual(suiteItem._children.length, 0);
  assert.ok(state.getSuiteItem('suite:ut_app'));

  resolveSuiteNode(controller, state, suiteItem);
  assert.strictEqual(suiteItem._children.length, 2);
  assert.ok(state.getItem('test:ut_app.test_one'));
});

test('resolveSchemaNode: idempotente (não duplica package)', async () => {
  const controller = makeController();
  const state = new TestStateManager();
  buildSchemaTree(controller, state, [suite({ dbSchema: 'APP' })], 'db/{schema}/**');
  const schemaItem = controller._items[0];
  await resolveSchemaNode(controller, state, schemaItem, lazyDeps as never);
  await resolveSchemaNode(controller, state, schemaItem, lazyDeps as never);
  assert.strictEqual(schemaItem._children.length, 1);
});

test('resolveSchemaNode: funde suites do banco quando há conexão', async () => {
  const controller = makeController();
  const state = new TestStateManager();
  buildSchemaTree(controller, state, [suite({ dbSchema: 'APP' })], 'db/{schema}/**');
  const schemaItem = controller._items[0];
  const deps = {
    resolveConnection: () => 'u/p@//h:1521/s',
    extractSchemaFromPath: () => 'APP',
    discoverDbSuites: async () => [suite({ dbSchema: 'APP', packageName: 'UT_DB_ONLY' })],
  };
  await resolveSchemaNode(controller, state, schemaItem, deps as never);
  assert.strictEqual(schemaItem._children.length, 2, 'deveria unir arquivo + banco');
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

test('collectAllItems: devolve as suites após resolução', async () => {
  const controller = makeController();
  const state = new TestStateManager();
  buildFileTree(controller, state, [suite({})]);
  const items = await collectAllItems(controller, state);
  assert.strictEqual(items.length, 1);
});

test('collectAllItems: resolve a árvore lazy e devolve as suites', async () => {
  const controller = makeController();
  const state = new TestStateManager();
  buildSchemaTree(controller, state, [suite({ dbSchema: 'APP' })], 'db/{schema}/**');

  const items = await collectAllItems(controller, state, lazyDeps as never);
  assert.strictEqual(items.length, 1);
  assert.strictEqual(items[0].id, 'suite:ut_app');
});

test('resolveSubtree: resolve schema → package → suite de um nó não expandido', async () => {
  const controller = makeController();
  const state = new TestStateManager();
  buildSchemaTree(controller, state, [suite({ dbSchema: 'APP' })], 'db/{schema}/**');
  const schemaItem = controller._items[0];

  await resolveSubtree(controller, state, schemaItem, lazyDeps as never);

  const pkgItem = schemaItem._children[0];
  const suiteItem = pkgItem._children[0];
  assert.strictEqual(suiteItem.id, 'suite:ut_app');
  assert.strictEqual(suiteItem._children.length, 2, 'testes deveriam ser materializados');
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

test('mergeDbSuites: discovery.source=file não busca suites do banco', async () => {
  __setConfigValue('discovery.source', 'file');
  const suites = [suite({})];
  let calls = 0;
  try {
    await mergeDbSuites(
      suites,
      [],
      'db/{schema}/**',
      mergeDeps({
        discoverSchemasFromFolders: async () => ['APP'],
        discoverDbSuites: async () => {
          calls++;
          return [];
        },
      }),
    );
  } finally {
    __resetConfigValues();
  }
  assert.strictEqual(calls, 0, 'não deveria consultar o banco com source=file');
  assert.strictEqual(suites.length, 1);
});
