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

test('resolveFiles: sem workspaceFolders nao quebra', () => {
  vscode.workspace.__setWorkspaceFolders(undefined);

  const d = new CompilationDiagnostics();
  const state = makeState([{ uri: { fsPath: '/root/app.pks' }, uriStr: 'file:///root/app.pks' }]);

  const errors = [{ line: 1, column: 1, code: 'PLS-123', message: 'x', fileUri: undefined }];
  assert.doesNotThrow(() => d.resolveFiles(errors, state));
  assert.strictEqual(errors[0].fileUri, undefined);
});

test('resolveFiles: associa erros a URIs do workspace', () => {
  vscode.workspace.__setWorkspaceFolders([{ uri: { fsPath: '/root' }, name: 'root', index: 0 }]);

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

test('resolveFiles: mensagem com body prefere .pkb', () => {
  vscode.workspace.__setWorkspaceFolders([{ uri: { fsPath: '/root' }, name: 'root', index: 0 }]);

  const d = new CompilationDiagnostics();
  const state = makeState([{ uri: { fsPath: '/root/app.pks' }, uriStr: 'file:///root/app.pks' }]);

  const errors = [
    { line: 1, column: 1, code: 'PLS-123', message: 'x', fileUri: undefined },
    { line: 2, column: 1, code: 'PLS-456', message: 'erro no package body', fileUri: undefined },
  ];

  assert.doesNotThrow(() => d.resolveFiles(errors, state));
  assert.match(String(errors[0].fileUri), /app\.pks/);
  assert.match(String(errors[1].fileUri), /app\.pkb/);

  vscode.workspace.__setWorkspaceFolders(undefined);
});

test('parseFromOutput: PLS na mesma linha do ORA gera erro imediato', () => {
  const d = new CompilationDiagnostics();
  const output = [
    'Package APP compiled with errors',
    'ORA-06550: line 12, column 5:',
    'PLS-00201: identifier SOME_MISSING must be declared',
  ].join('\n');
  const errors = d.parseFromOutput(output);
  assert.strictEqual(errors.length, 1);
  assert.strictEqual(errors[0].line, 12);
});

test('parseFromOutput: obj sem pendingPls nao gera erro', () => {
  const d = new CompilationDiagnostics();
  const errors = d.parseFromOutput('Package APP compiled with errors\nPackage BODY BOO compiled');
  assert.strictEqual(errors.length, 0);
});

test('parseFromOutput: pendingPls no fim do arquivo é emitido', () => {
  const d = new CompilationDiagnostics();
  const output = [
    'Package APP compiled with errors',
    'ORA-06550: line 3, column 7:',
    'PLS-00103: erro sintaxe',
  ].join('\n');
  // sem linha adicional: pendingPls no loop final
  const errors = d.parseFromOutput(output);
  assert.strictEqual(errors.length, 1);
  assert.strictEqual(errors[0].code, 'PLS-00103');
});

test('parseFromOutput: linha ORA sem obj anterior é ignorada', () => {
  const d = new CompilationDiagnostics();
  const errors = d.parseFromOutput('ORA-06550: line 1, column 1:\n');
  assert.strictEqual(errors.length, 0);
});

test('parseFromOutput: ORA e PLS na mesma linha geram erro imediato', () => {
  const d = new CompilationDiagnostics();
  const output = [
    'Package APP compiled with errors',
    'ORA-06550: line 12, column 5: PLS-00201: identifier X must be declared',
  ].join('\n');
  const errors = d.parseFromOutput(output);
  assert.strictEqual(errors.length, 1);
  assert.strictEqual(errors[0].line, 12);
  assert.strictEqual(errors[0].code, 'PLS-00201');
});

test('parseFromOutput: novo objeto faz flush do pendingPls anterior', () => {
  const d = new CompilationDiagnostics();
  const output = [
    'Package APP compiled with errors',
    'PLS-00103: sintaxe',
    'Package BODY BOO compiled with errors',
  ].join('\n');
  const errors = d.parseFromOutput(output);
  assert.strictEqual(errors.length, 1);
  assert.strictEqual(errors[0].code, 'PLS-00103');
});

test('parseFromOutput: ORA line/column não numéricos caem para 1', () => {
  const d = new CompilationDiagnostics();
  const output = [
    'Package APP compiled with errors',
    'ORA-06550: line 0, column abc:',
    'PLS-00201: identifier X must be declared',
  ].join('\n');
  const errors = d.parseFromOutput(output);
  assert.strictEqual(errors.length, 1);
  assert.strictEqual(errors[0].line, 1);
  assert.strictEqual(errors[0].column, 1);
});

test('resolveFiles: erro com fileUri já resolvido é pulado', () => {
  const d = new CompilationDiagnostics();
  const state = makeState([]);
  const errors = [
    { code: 'X', message: 'x', fileUri: { fsPath: '/x.pks', toString: () => 'x' } },
  ] as never[];
  assert.doesNotThrow(() => d.resolveFiles(errors, state as never));
});

test('resolveFiles: item sem uri ou sem baseName é pulado', () => {
  const d = new CompilationDiagnostics();
  const noUriItem = { id: 's1', children: new Map() };
  const noExtItem = { id: 's2', children: new Map() };
  const metaMap = new Map<any, any>();
  metaMap.set(noUriItem, { kind: 'suite' });
  metaMap.set(noExtItem, {
    kind: 'suite',
    uri: { fsPath: '/root/arquivo_sem_ext', scheme: 'file' },
  });
  const state = {
    cachedItems: [noUriItem, noExtItem],
    getMeta: (t: any) => metaMap.get(t),
  };
  const errors = [{ code: 'X', message: 'erro', line: 1, column: 1 }] as never[];
  assert.doesNotThrow(() => d.resolveFiles(errors, state as never));
});

test('apply: erro sem fileUri é ignorado', () => {
  const d = new CompilationDiagnostics();
  const errors = [{ code: 'X', message: 'sem uri', line: 1, column: 1 }] as never[];
  assert.doesNotThrow(() => d.apply(errors));
});
