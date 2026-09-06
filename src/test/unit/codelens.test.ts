import './setup.js';
import assert from 'node:assert';
import { test } from 'node:test';
import { parseCodeLensItems, UtplsqlCodeLensProvider } from '../../codelens';
import * as vscode from '../vscode-stub';
import { __setConfigValue } from '../vscode-stub';

function pkgWrapper(inner: string): string {
  return ['CREATE OR REPLACE PACKAGE test_math IS', inner, 'END;'].join('\n');
}

test('parseCodeLensItems: suite com descricao', () => {
  const items = parseCodeLensItems(pkgWrapper('--%suite(Math Tests)\n  PROCEDURE add;'));
  assert.strictEqual(items.length, 1);
  assert.strictEqual(items[0].type, 'suite');
  assert.strictEqual(items[0].description, 'Math Tests');
  assert.strictEqual(items[0].packageName, 'test_math');
  assert.strictEqual(items[0].line, 1);
});

test('parseCodeLensItems: test com procedure', () => {
  const items = parseCodeLensItems(
    pkgWrapper('--%suite(Math)\n  --%test(Addition)\n  PROCEDURE add;'),
  );
  assert.strictEqual(items.length, 2);
  assert.strictEqual(items[0].type, 'suite');
  assert.strictEqual(items[1].type, 'test');
  assert.strictEqual(items[1].description, 'Addition');
  assert.strictEqual(items[1].procName, 'add');
  assert.strictEqual(items[1].line, 2);
});

test('parseCodeLensItems: arquivo sem anotacoes', () => {
  const items = parseCodeLensItems(pkgWrapper('  PROCEDURE add;'));
  assert.strictEqual(items.length, 0);
});

test('parseCodeLensItems: suite sem descricao usa packageName', () => {
  const items = parseCodeLensItems(pkgWrapper('--%suite\n  PROCEDURE add;'));
  assert.strictEqual(items.length, 1);
  assert.strictEqual(items[0].description, 'test_math');
});

test('parseCodeLensItems: test sem procedure e ignorado', () => {
  const items = parseCodeLensItems(
    pkgWrapper('--%suite(Math)\n  --%test(Orphan)\n  v_foo NUMBER;'),
  );
  assert.strictEqual(items.length, 1);
  assert.strictEqual(items[0].type, 'suite');
});

test('parseCodeLensItems: multiplos testes', () => {
  const items = parseCodeLensItems(
    pkgWrapper(
      '--%suite(Math)\n  --%test(Add)\n  PROCEDURE add;\n  --%test(Sub)\n  PROCEDURE sub;\n  --%test(Mul)\n  PROCEDURE mul;',
    ),
  );
  assert.strictEqual(items.length, 4);
  assert.strictEqual(items[0].type, 'suite');
  assert.strictEqual(items[1].type, 'test');
  assert.strictEqual(items[1].procName, 'add');
  assert.strictEqual(items[2].procName, 'sub');
  assert.strictEqual(items[3].procName, 'mul');
});

test('parseCodeLensItems: sem CREATE PACKAGE retorna vazio', () => {
  const items = parseCodeLensItems('--%suite(Math)\n  PROCEDURE add;');
  assert.strictEqual(items.length, 0);
});

test('UtplsqlCodeLensProvider: gera 2 lenses por anotacao', () => {
  __setConfigValue('codeLens.enabled', true);
  const provider = new UtplsqlCodeLensProvider();
  const doc = {
    getText: () => pkgWrapper('--%suite(Math)\n  --%test(Add)\n  PROCEDURE add;'),
    fileName: '/test/test_math.pks',
    uri: { toString: () => 'file:///test/test_math.pks' },
    // biome-ignore lint/suspicious/noExplicitAny: partial TextDocument mock
  } as any;
  // biome-ignore lint/suspicious/noExplicitAny: partial CancellationToken mock
  const lenses = provider.provideCodeLenses(doc, {} as any);
  assert.strictEqual(lenses.length, 4);
  assert.strictEqual(lenses[0].command?.title, '▶ Run Suite');
  assert.strictEqual(lenses[1].command?.title, '▶ Run Suite with Coverage');
  assert.strictEqual(lenses[2].command?.title, '▶ Run Test');
  assert.strictEqual(lenses[3].command?.title, '▶ Run Test with Coverage');
});

test('UtplsqlCodeLensProvider: arquivo sem anotacoes retorna vazio', () => {
  const provider = new UtplsqlCodeLensProvider();
  const doc = {
    getText: () => pkgWrapper('  PROCEDURE add;'),
    fileName: '/test/test_math.pks',
    uri: { toString: () => 'file:///test/test_math.pks' },
    // biome-ignore lint/suspicious/noExplicitAny: partial TextDocument mock
  } as any;
  // biome-ignore lint/suspicious/noExplicitAny: partial CancellationToken mock
  const lenses = provider.provideCodeLenses(doc, {} as any);
  assert.strictEqual(lenses.length, 0);
});

test('UtplsqlCodeLensProvider: arquivo .sql e ignorado', () => {
  const provider = new UtplsqlCodeLensProvider();
  const doc = {
    getText: () => pkgWrapper('--%suite(Math)\n  PROCEDURE add;'),
    fileName: '/test/test_math.sql',
    uri: { toString: () => 'file:///test/test_math.sql' },
    // biome-ignore lint/suspicious/noExplicitAny: partial TextDocument mock
  } as any;
  // biome-ignore lint/suspicious/noExplicitAny: partial CancellationToken mock
  const lenses = provider.provideCodeLenses(doc, {} as any);
  assert.strictEqual(lenses.length, 0);
});

test('UtplsqlCodeLensProvider: refresh dispara onDidChangeCodeLenses', () => {
  const provider = new UtplsqlCodeLensProvider();
  let fired = 0;
  const sub = provider.onDidChangeCodeLenses(() => {
    fired++;
  });
  provider.refresh();
  provider.refresh();
  assert.strictEqual(fired, 2);
  sub.dispose();
});

test('UtplsqlCodeLensProvider: codeLensEnabled false retorna vazio', async () => {
  const { __setConfigValue } = await import('../vscode-stub.js');
  __setConfigValue('codeLens.enabled', false);
  const provider = new UtplsqlCodeLensProvider();
  const doc = {
    getText: () => '--%suite(Math)\n',
    fileName: '/test/test_math.pks',
    uri: { toString: () => 'file:///test/test_math.pks' },
    // biome-ignore lint/suspicious/noExplicitAny: partial TextDocument mock
  } as any;
  // biome-ignore lint/suspicious/noExplicitAny: partial CancellationToken mock
  const lenses = provider.provideCodeLenses(doc, {} as any);
  assert.strictEqual(lenses.length, 0);
});

test('parseCodeLensItems: test sem descrição usa procName', () => {
  const text = [
    'CREATE OR REPLACE PACKAGE ut_ex AS',
    '  --%suite',
    '  PROCEDURE add;',
    '  --%test',
    '  PROCEDURE add_ok;',
  ].join('\n');
  const items = parseCodeLensItems(text);
  assert.strictEqual(items.length, 2);
  const testItem = items[1];
  assert.strictEqual(testItem.type, 'test');
  assert.strictEqual(testItem.description, 'add_ok');
});
