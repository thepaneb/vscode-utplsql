import assert from 'node:assert';
import { test } from 'node:test';
import { filterSuitesByFolder, filterSuitesByUri } from '../../matching';
import type { ItemMeta } from '../../types';

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
