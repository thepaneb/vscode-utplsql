import assert from 'node:assert';
import { test } from 'node:test';
import {
  buildMatchIndex,
  filterSuitesByFolder,
  filterSuitesByUri,
  findByNameOnly,
  type MatchEntry,
  resolveRunRoots,
} from '../../matching';
import type { ItemMeta } from '../../types';

function testMeta(over: Partial<ItemMeta>): ItemMeta {
  return {
    kind: 'test',
    packageName: 'app',
    procName: 'proc',
    description: 'desc',
    uri: { fsPath: '/root/app.pks', path: '/root/app.pks', scheme: 'file' } as any,
    folder: { uri: { fsPath: '/root' }, name: 'root', index: 0 } as any,
    ...over,
  } as ItemMeta;
}

function entry(id: string, meta: ItemMeta): MatchEntry {
  return { item: { id } as any, meta };
}

function suiteMeta(pkg: string, uriFsPath: string): ItemMeta {
  return {
    kind: 'suite',
    packageName: pkg,
    uri: { fsPath: uriFsPath, path: uriFsPath, scheme: 'file' } as any,
    folder: { uri: { fsPath: '/root' }, name: 'root', index: 0 } as any,
  };
}

test('filterSuitesByUri: encontra suite pelo nome do arquivo', () => {
  const items: ItemMeta[] = [suiteMeta('app', '/root/app.pks')];
  const result = filterSuitesByUri(items, '/root/app.pks');
  assert.strictEqual(result.length, 1);
  assert.strictEqual(result[0].packageName, 'app');
});

test('filterSuitesByUri: ignora arquivo com nome diferente', () => {
  const items: ItemMeta[] = [suiteMeta('app', '/root/app.pks')];
  const result = filterSuitesByUri(items, '/root/other.pks');
  assert.strictEqual(result.length, 0);
});

test('filterSuitesByUri: ignora extensao .pks e .pkb', () => {
  const items: ItemMeta[] = [suiteMeta('app', '/root/app.pks'), suiteMeta('lib', '/root/lib.pkb')];
  const result = filterSuitesByUri(items, '/root/app.pks');
  assert.strictEqual(result.length, 1);
  assert.strictEqual(result[0].packageName, 'app');
});

test('filterSuitesByUri: case insensitive', () => {
  const items: ItemMeta[] = [suiteMeta('App', '/root/APP.PKS')];
  const result = filterSuitesByUri(items, '/root/app.pks');
  assert.strictEqual(result.length, 1);
  assert.strictEqual(result[0].packageName, 'App');
});

test('filterSuitesByUri: caminhos com subdiretorios', () => {
  const items: ItemMeta[] = [suiteMeta('app', '/root/src/app.pks')];
  const result = filterSuitesByUri(items, '/root/src/app.pks');
  assert.strictEqual(result.length, 1);
});

test('filterSuitesByUri: nao encontra se kind nao for suite', () => {
  const item: ItemMeta = {
    kind: 'test',
    packageName: 'app',
    procName: 'test1',
    description: 'test',
    uri: { fsPath: '/root/app.pks', path: '/root/app.pks', scheme: 'file' } as any,
    folder: { uri: { fsPath: '/root' }, name: 'root', index: 0 } as any,
  };
  const result = filterSuitesByUri([item], '/root/app.pks');
  assert.strictEqual(result.length, 0);
});

test('filterSuitesByFolder: encontra suites dentro da pasta', () => {
  const items: ItemMeta[] = [
    suiteMeta('app', '/root/src/app.pks'),
    suiteMeta('lib', '/root/src/lib.pks'),
  ];
  const result = filterSuitesByFolder(items, '/root/src');
  assert.strictEqual(result.length, 2);
});

test('filterSuitesByFolder: ignora suites fora da pasta', () => {
  const items: ItemMeta[] = [
    suiteMeta('app', '/root/src/app.pks'),
    suiteMeta('other', '/other/pkg.pks'),
  ];
  const result = filterSuitesByFolder(items, '/root');
  assert.strictEqual(result.length, 1);
  assert.strictEqual(result[0].packageName, 'app');
});

test('filterSuitesByFolder: pasta vazia retorna vazio', () => {
  const items: ItemMeta[] = [suiteMeta('app', '/root/app.pks')];
  const result = filterSuitesByFolder(items, '');
  assert.strictEqual(result.length, 0);
});

test('filterSuitesByFolder: nao encontra se kind nao for suite', () => {
  const item: ItemMeta = {
    kind: 'test',
    packageName: 'app',
    procName: 'test1',
    description: 'test',
    uri: { fsPath: '/root/app.pks', path: '/root/app.pks', scheme: 'file' } as any,
    folder: { uri: { fsPath: '/root' }, name: 'root', index: 0 } as any,
  };
  const result = filterSuitesByFolder([item], '/root');
  assert.strictEqual(result.length, 0);
});

test('filterSuitesByUri: lista vazia retorna vazio', () => {
  const result = filterSuitesByUri([], '/root/app.pks');
  assert.strictEqual(result.length, 0);
});

test('filterSuitesByFolder: lista vazia retorna vazio', () => {
  const result = filterSuitesByFolder([], '/root');
  assert.strictEqual(result.length, 0);
});

// ── buildMatchIndex ──────────────────────────────────────────────────

test('buildMatchIndex: 2 testes no mesmo package geram 4 chaves', () => {
  const index = buildMatchIndex([
    entry('t1', testMeta({ packageName: 'ut_pkg', procName: 'proc_a', description: 'Desc A' })),
    entry('t2', testMeta({ packageName: 'ut_pkg', procName: 'proc_b', description: 'Desc B' })),
  ]);
  assert.strictEqual(index.size, 4);
  assert.strictEqual(index.get('ut_pkg|proc_a')?.id, 't1');
  assert.strictEqual(index.get('ut_pkg|desc a')?.id, 't1');
  assert.strictEqual(index.get('ut_pkg|proc_b')?.id, 't2');
  assert.strictEqual(index.get('ut_pkg|desc b')?.id, 't2');
});

test('buildMatchIndex: 0 entradas retorna Map vazio', () => {
  const index = buildMatchIndex([]);
  assert.ok(index instanceof Map);
  assert.strictEqual(index.size, 0);
});

test('buildMatchIndex: entrada kind suite e ignorada', () => {
  const meta = testMeta({}) as any;
  meta.kind = 'suite';
  const index = buildMatchIndex([entry('suite:app', meta)]);
  assert.strictEqual(index.size, 0);
});

// ── findByNameOnly ───────────────────────────────────────────────────

test('findByNameOnly: encontra por procName', () => {
  const e = entry('t1', testMeta({ procName: 'proc_x', description: 'desc x' }));
  const found = findByNameOnly([e], 'proc_x');
  assert.ok(found);
  assert.strictEqual(found?.id, 't1');
});

test('findByNameOnly: encontra por description', () => {
  const e = entry('t1', testMeta({ procName: 'proc_x', description: 'desc x' }));
  const found = findByNameOnly([e], 'desc x');
  assert.ok(found);
  assert.strictEqual(found?.id, 't1');
});

test('findByNameOnly: description com trailing space encontra via trim', () => {
  const e = entry('t1', testMeta({ procName: 'proc_x', description: 'desc x ' }));
  const found = findByNameOnly([e], 'desc x');
  assert.ok(found);
  assert.strictEqual(found?.id, 't1');
});

test('findByNameOnly: case insensitive', () => {
  const e = entry('t1', testMeta({ procName: 'proc_x', description: 'desc x' }));
  const found = findByNameOnly([e], 'PROC_X');
  assert.ok(found);
  assert.strictEqual(found?.id, 't1');
});

test('findByNameOnly: nome inexistente retorna undefined', () => {
  const e = entry('t1', testMeta({ procName: 'proc_x', description: 'desc x' }));
  const found = findByNameOnly([e], 'nao_existe');
  assert.strictEqual(found, undefined);
});

test('findByNameOnly: ignora entries que nao sao test', () => {
  const meta = testMeta({ procName: 'proc_x', description: 'desc x' }) as any;
  meta.kind = 'suite';
  const found = findByNameOnly([entry('suite:app', meta)], 'proc_x');
  assert.strictEqual(found, undefined);
});

test('findByNameOnly: lista vazia retorna undefined', () => {
  const found = findByNameOnly([], 'proc_x');
  assert.strictEqual(found, undefined);
});

// ── Roots por folder (PRD-57) ──────────────────────────────────────────

const FOLDERS = [{ uri: { fsPath: '/root/a' } }, { uri: { fsPath: '/root/b' } }];

test('resolveRunRoots: itens de um folder devolvem só esse root', () => {
  const metas = [
    testMeta({ folder: { uri: { fsPath: '/root/a' }, name: 'a', index: 0 } as any }),
    testMeta({ folder: { uri: { fsPath: '/root/a' }, name: 'a', index: 0 } as any }),
  ];
  assert.deepStrictEqual(resolveRunRoots(metas, FOLDERS), ['/root/a']);
});

test('resolveRunRoots: itens de folders distintos devolvem os dois (sem repetir)', () => {
  const metas = [
    testMeta({ folder: { uri: { fsPath: '/root/a' }, name: 'a', index: 0 } as any }),
    testMeta({ folder: { uri: { fsPath: '/root/b' }, name: 'b', index: 1 } as any }),
    testMeta({ folder: { uri: { fsPath: '/root/a' }, name: 'a', index: 0 } as any }),
  ];
  assert.deepStrictEqual(resolveRunRoots(metas, FOLDERS), ['/root/a', '/root/b']);
});

test('resolveRunRoots: sem meta/ folder desconhecido cai em todos os folders', () => {
  assert.deepStrictEqual(resolveRunRoots([undefined], FOLDERS), ['/root/a', '/root/b']);
  assert.deepStrictEqual(
    resolveRunRoots([testMeta({ folder: { uri: { fsPath: '/outro' } } as any })], FOLDERS),
    ['/root/a', '/root/b'],
  );
  assert.deepStrictEqual(resolveRunRoots([], FOLDERS), ['/root/a', '/root/b']);
});

test('resolveRunRoots: single-root devolve exatamente uma raiz (regressão zero)', () => {
  const folders = [{ uri: { fsPath: '/root/unico' } }];
  assert.deepStrictEqual(
    resolveRunRoots([testMeta({ folder: { uri: { fsPath: '/root/unico' } } as any })], folders),
    ['/root/unico'],
  );
  assert.deepStrictEqual(resolveRunRoots([undefined], folders), ['/root/unico']);
});

test('resolveRunRoots: sem folders devolve lista vazia', () => {
  assert.deepStrictEqual(resolveRunRoots([testMeta({})], []), []);
});
