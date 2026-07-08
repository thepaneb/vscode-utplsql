import './setup.js';
import assert from 'node:assert';
import { test } from 'node:test';
import { discoverWorkspace, parseSuite } from '../../discovery';

test('parseSuite: retorna ParsedSuite para arquivo com %suite', () => {
  const text = `CREATE OR REPLACE PACKAGE test_app IS
  --%suite(Testes)
  --%test(Cenario)
  PROCEDURE proc1;
END;`;
  const uri = { fsPath: '/x/test_app.pks', path: '/x/test_app.pks', scheme: 'file' };
  const result = parseSuite(uri as any, text);
  assert.ok(result);
  assert.strictEqual(result.packageName, 'test_app');
  assert.strictEqual(result.suiteDescription, 'Testes');
  assert.strictEqual(result.tests.length, 1);
  assert.strictEqual(result.tests[0].procName, 'proc1');
  assert.strictEqual(result.uri.fsPath, '/x/test_app.pks');
});

test('parseSuite: retorna null para arquivo sem %suite', () => {
  const text = 'CREATE OR REPLACE PACKAGE normal IS\nPROCEDURE proc1;\nEND;';
  const uri = { fsPath: '/x/normal.pks', path: '/x/normal.pks', scheme: 'file' };
  const result = parseSuite(uri as any, text);
  assert.strictEqual(result, null);
});

test('parseSuite: retorna null para texto vazio', () => {
  const uri = { fsPath: '/x/vazio.pks', path: '/x/vazio.pks', scheme: 'file' };
  const result = parseSuite(uri as any, '');
  assert.strictEqual(result, null);
});

test('discoverWorkspace: retorna lista vazia quando sem pastas', async () => {
  const result = await discoverWorkspace(['**/*.pks'], []);
  assert.ok(Array.isArray(result));
  assert.strictEqual(result.length, 0);
});

test('discoverWorkspace: encontra suites em arquivos .pks', async () => {
  const { __setMockFile, __resetMockFiles } = await import('../vscode-stub.js');
  __setMockFile(
    '*.pks',
    '/root/test_app.pks',
    'CREATE OR REPLACE PACKAGE test_app IS\n  --%suite(Testes)\n  --%test(Cenario)\n  PROCEDURE proc1;\nEND;',
  );
  try {
    const folder = { uri: { fsPath: '/root' }, name: 'root', index: 0 };
    const result = await discoverWorkspace(['*.pks'], [folder as any]);
    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0].packageName, 'test_app');
    assert.strictEqual(result[0].suiteDescription, 'Testes');
    assert.strictEqual(result[0].tests.length, 1);
    assert.strictEqual(result[0].tests[0].procName, 'proc1');
    assert.strictEqual(result[0].folder, folder);
  } finally {
    __resetMockFiles();
  }
});
