// biome-ignore-all lint/suspicious/noExplicitAny: stubs de teste para a árvore
import './setup.js';
import assert from 'node:assert';
import { test } from 'node:test';
import type { SuiteFile } from '../../discovery';
import { TestStateManager } from '../../state';
import { buildFileTree, buildSchemaTree, collectAllItems } from '../../testTree';

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
