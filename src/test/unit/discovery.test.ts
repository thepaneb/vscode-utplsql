import './setup.js';
import assert from 'node:assert';
import { test } from 'node:test';
import { discoverWorkspace, extractSchemaFromPath, parseSuite } from '../../discovery';

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

test('discoverWorkspace: arquivo ilegivel e ignorado', async () => {
  const { __setMockFile, __resetMockFiles, __setMockFileError } = await import('../vscode-stub.js');
  __setMockFile(
    '*.pks',
    '/root/bad.pks',
    'CREATE OR REPLACE PACKAGE bad IS\n  --%suite(ok)\n  --%test(x)\nPROCEDURE x;\nEND;',
  );
  __setMockFileError('/root/bad.pks', true);
  try {
    const folder = { uri: { fsPath: '/root' }, name: 'root', index: 0 };
    const result = await discoverWorkspace(['*.pks'], [folder as any]);
    assert.strictEqual(result.length, 0);
  } finally {
    __resetMockFiles();
  }
});

test('discoverWorkspace: suite sem testes e ignorada', async () => {
  const { __setMockFile, __resetMockFiles } = await import('../vscode-stub.js');
  __setMockFile(
    '*.pks',
    '/root/empty_suite.pks',
    'CREATE OR REPLACE PACKAGE empty_suite IS\n  --%suite(Sem testes)\nEND;',
  );
  try {
    const folder = { uri: { fsPath: '/root' }, name: 'root', index: 0 };
    const result = await discoverWorkspace(['*.pks'], [folder as any]);
    assert.strictEqual(result.length, 0);
  } finally {
    __resetMockFiles();
  }
});

test('discoverWorkspace: pattern sem match retorna vazio', async () => {
  const result = await discoverWorkspace(
    ['**/*.xyz'],
    [{ uri: { fsPath: '/root' }, name: 'root', index: 0 } as any],
  );
  assert.strictEqual(result.length, 0);
});

test('extractSchemaFromPath: extrai schema com padrao db/{schema}/**', () => {
  assert.strictEqual(
    extractSchemaFromPath('/root/db/APP/tests/packages/ut_foo.pks', '/root', 'db/{schema}/**'),
    'APP',
  );
  assert.strictEqual(
    extractSchemaFromPath('/root/db/LOGIC/tests/packages/ut_bar.pks', '/root', 'db/{schema}/**'),
    'LOGIC',
  );
});

test('extractSchemaFromPath: retorna undefined quando nao da match', () => {
  assert.strictEqual(
    extractSchemaFromPath('/root/src/ut_baz.pks', '/root', 'db/{schema}/**'),
    undefined,
  );
});

test('extractSchemaFromPath: padrao customizado src/{schema}/tests/**', () => {
  assert.strictEqual(
    extractSchemaFromPath('/root/src/MYSCHEMA/tests/ut_foo.pks', '/root', 'src/{schema}/tests/**'),
    'MYSCHEMA',
  );
});

test('extractSchemaFromPath: multiplos niveis entre schema e arquivo', () => {
  assert.strictEqual(
    extractSchemaFromPath(
      '/root/db/HR/tests/integration/packages/ut_hr.pks',
      '/root',
      'db/{schema}/**',
    ),
    'HR',
  );
});

test('extractSchemaFromPath: arquivo fora do workspace retorna undefined', () => {
  assert.strictEqual(
    extractSchemaFromPath('/other/APP/test.pks', '/root', 'db/{schema}/**'),
    undefined,
  );
});

test('extractSchemaFromPath: caminho Windows com backslash', () => {
  const result = extractSchemaFromPath(
    'C:\\projects\\root\\db\\SALES\\tests\\ut_foo.pks',
    'C:\\projects\\root',
    'db/{schema}/**',
  );
  assert.strictEqual(result, 'SALES');
});
