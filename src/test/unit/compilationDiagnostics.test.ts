import './setup.js';
import assert from 'node:assert';
import { test } from 'node:test';
import { CompilationDiagnostics } from '../../compilationDiagnostics';
import * as vscode from '../vscode-stub';

function makeState(items: { uri: { fsPath: string }; uriStr: string }[]) {
  const cachedItems = items.map((i) => ({
    id: `suite:${i.uri.fsPath}`,
    children: new Map(),
  }));
  const metaMap = new Map<any, any>();
  for (const item of cachedItems) {
    const orig = items.find((i) => `suite:${i.uri.fsPath}` === item.id);
    if (orig) {
      metaMap.set(item, {
        kind: 'suite',
        packageName: orig.uri.fsPath.replace(/\.pks$/, ''),
        uri: { fsPath: orig.uri.fsPath, scheme: 'file' },
        folder: { uri: { fsPath: '/root' }, name: 'root', index: 0 },
      });
    }
  }
  return {
    cachedItems,
    getMeta: (t: any) => metaMap.get(t),
    setMeta: () => {},
    setCoverage: () => {},
    getCoverage: () => [],
    clearCoverage: () => {},
  } as any;
}

test('parseFromOutput: extrai erros PLS de ORA-06550', () => {
  const d = new CompilationDiagnostics();
  const output = [
    'Package APP compiled with errors',
    'ORA-06550: line 12, column 5:',
    'PLS-00201: identifier SOME_MISSING must be declared',
  ].join('\n');

  const errors = d.parseFromOutput(output);
  assert.strictEqual(errors.length, 1);
  assert.strictEqual(errors[0].code, 'PLS-00201');
  assert.strictEqual(errors[0].line, 12);
  assert.strictEqual(errors[0].column, 5);
  assert.match(errors[0].message, /SOME_MISSING/);
});

test('parseFromOutput: zero erros com output sem problemas', () => {
  const d = new CompilationDiagnostics();
  const output = 'Tests passed.\n0 failed, 3 passed, 0 errored\n';
  const errors = d.parseFromOutput(output);
  assert.strictEqual(errors.length, 0);
});

test('parseFromOutput: multiplos erros no mesmo arquivo', () => {
  const d = new CompilationDiagnostics();
  const output = [
    'Package APP compiled with errors',
    'ORA-06550: line 5, column 1:',
    'PLS-00103: Encountered the symbol "X"',
    'ORA-06550: line 15, column 8:',
    'PLS-00201: identifier MISSING must be declared',
  ].join('\n');

  const errors = d.parseFromOutput(output);
  assert.strictEqual(errors.length, 2);
  assert.strictEqual(errors[0].code, 'PLS-00103');
  assert.strictEqual(errors[0].line, 5);
  assert.strictEqual(errors[1].code, 'PLS-00201');
  assert.strictEqual(errors[1].line, 15);
});

test('parseFromOutput: string vazia retorna array vazio', () => {
  const d = new CompilationDiagnostics();
  const errors = d.parseFromOutput('');
  assert.strictEqual(errors.length, 0);
});

test('parseFromOutput: apenas PLS sem ORA line nao quebra', () => {
  const d = new CompilationDiagnostics();
  const output = ['Package APP compiled with errors', 'PLS-00201: identifier X not declared'].join(
    '\n',
  );

  const errors = d.parseFromOutput(output);
  assert.strictEqual(errors.length, 1);
  assert.strictEqual(errors[0].code, 'PLS-00201');
  assert.strictEqual(errors[0].line, 1);
  assert.strictEqual(errors[0].column, 1);
});

test('apply: agrupa erros por URI', () => {
  const d = new CompilationDiagnostics();
  const errors = [
    {
      line: 5,
      column: 1,
      code: 'PLS-00103',
      message: 'syntax error',
      fileUri: {
        scheme: 'file',
        fsPath: '/test/app.pks',
        toString: () => 'file:///test/app.pks',
      } as any,
    },
    {
      line: 12,
      column: 5,
      code: 'PLS-00201',
      message: 'identifier not declared',
      fileUri: {
        scheme: 'file',
        fsPath: '/test/app.pks',
        toString: () => 'file:///test/app.pks',
      } as any,
    },
  ];

  assert.doesNotThrow(() => d.apply(errors));
  d.clear();
});

test('clear: nao lanca erro', () => {
  const d = new CompilationDiagnostics();
  assert.doesNotThrow(() => d.clear());
});

test('dispose: nao lanca erro', () => {
  const d = new CompilationDiagnostics();
  assert.doesNotThrow(() => d.dispose());
});

test('resolveFiles: associa erros a URIs do workspace', () => {
  vscode.workspace.__setWorkspaceFolders([
    { uri: { fsPath: '/root' }, name: 'root', index: 0 },
  ]);

  const d = new CompilationDiagnostics();
  const state = makeState([{ uri: { fsPath: '/root/app.pks' }, uriStr: 'file:///root/app.pks' }]);

  const errors = [
    {
      line: 1,
      column: 1,
      code: 'PLS-00123',
      message: 'some error in body',
      fileUri: undefined,
    },
  ];

  assert.doesNotThrow(() => d.resolveFiles(errors, state));
  assert.ok(errors[0].fileUri);

  vscode.workspace.__setWorkspaceFolders(undefined);
});

test('resolveFiles: lista vazia nao quebra', () => {
  const d = new CompilationDiagnostics();
  const state = makeState([]);
  assert.doesNotThrow(() => d.resolveFiles([], state));
});
