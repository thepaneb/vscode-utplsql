import './setup.js';
import assert from 'node:assert';
import { test } from 'node:test';
import * as vscode from 'vscode';
import { DecorationManager } from '../../decorations';
import { __setConfigValue, __setVisibleEditors } from '../../test/vscode-stub';

test('DecorationManager: update com results vazio nao quebra', () => {
  __setConfigValue('decorations.enabled', true);
  const mgr = new DecorationManager();
  assert.doesNotThrow(() => {
    mgr.update(new Map(), { items: new Map() } as any);
  });
  assert.strictEqual(mgr.hasResults(), false);
});

test('DecorationManager: update com TestItem populado armazena resultados', () => {
  __setConfigValue('decorations.enabled', true);
  const mgr = new DecorationManager();
  const uri = vscode.Uri.file('/test/math.pks');
  const testItem: any = {
    id: 'test:test_math.add',
    label: 'add',
    uri: uri,
    range: new vscode.Range(3, 0, 3, 0),
    children: new Map(),
    canResolveChildren: false,
  };
  const suiteItem: any = {
    id: 'suite:test_math',
    label: 'test_math',
    uri: uri,
    range: new vscode.Range(1, 0, 1, 0),
    children: new Map([['test:test_math.add', testItem]]),
    canResolveChildren: false,
  };
  const controller = {
    items: new Map([['suite:test_math', suiteItem]]),
  };
  const resultMap = new Map([['test:test_math.add', { status: 'passed' }]]);
  mgr.update(resultMap, controller as any);
  assert.strictEqual(mgr.hasResults(), true);
});

test('DecorationManager: clear limpa os resultados', () => {
  __setConfigValue('decorations.enabled', true);
  const mgr = new DecorationManager();
  const controller = {
    items: new Map([
      [
        'suite:x',
        {
          id: 'suite:x',
          uri: vscode.Uri.file('/x.pks'),
          range: new vscode.Range(0, 0, 0, 0),
          children: new Map(),
        },
      ],
    ]),
  };
  mgr.update(new Map([['suite:x', { status: 'failed' }]]), controller as any);
  assert.strictEqual(mgr.hasResults(), true);
  mgr.clear();
  assert.strictEqual(mgr.hasResults(), false);
});

test('DecorationManager: dispose nao lanca erro', () => {
  const mgr = new DecorationManager();
  assert.doesNotThrow(() => {
    mgr.dispose();
  });
});

test('DecorationManager: applyToVisibleEditors com editor visivel', () => {
  __setConfigValue('decorations.enabled', true);
  const mgr = new DecorationManager();
  const uri = vscode.Uri.file('/test/math.pks');

  const decoratedCalls: any[] = [];
  const mockEditor = {
    document: { uri },
    setDecorations: (_type: any, opts: any[]) => {
      decoratedCalls.push({ opts });
    },
  };
  __setVisibleEditors([mockEditor]);

  const controller = {
    items: new Map([
      [
        'suite:test_math',
        {
          id: 'suite:test_math',
          uri,
          range: new vscode.Range(1, 0, 1, 0),
          children: new Map([
            ['test:test_math.add', { id: 'test:test_math.add', uri, range: new vscode.Range(3, 0, 3, 0) }],
          ]),
        },
      ],
    ]),
  };

  mgr.update(new Map([['test:test_math.add', { status: 'passed' }]]), controller as any);
  assert.strictEqual(mgr.hasResults(), true);
  assert.ok(decoratedCalls.length > 0, 'setDecorations deveria ter sido chamado');

  __setVisibleEditors([]);
});

test('DecorationManager: applyToEditor com status failed e errored', () => {
  __setConfigValue('decorations.enabled', true);
  const mgr = new DecorationManager();

  const allCalls: any[] = [];
  const mockEditor = {
    document: { uri: vscode.Uri.file('/test/x.pks') },
    setDecorations: (_type: any, opts: any[]) => {
      if (opts.length > 0) {
        allCalls.push(...opts);
      }
    },
  };

  const entries = [
    { line: 5, status: 'failed', message: 'Expected 1 got 0' },
    { line: 10, status: 'error', message: 'ORA-00001' },
  ];
  mgr.applyToEditor(mockEditor as any, entries);

  assert.ok(allCalls.length >= 1, 'setDecorations chamado pelo menos 1 vez');
});

test('DecorationManager: applyToEditor com skipped', () => {
  const mgr = new DecorationManager();
  const skippedCalls: any[] = [];
  const mockEditor = {
    document: { uri: vscode.Uri.file('/test/y.pks') },
    setDecorations: (_type: any, opts: any[]) => {
      skippedCalls.push(...opts);
    },
  };

  mgr.applyToEditor(mockEditor as any, [{ line: 8, status: 'skipped' }]);
  assert.ok(skippedCalls.length > 0);
});

test('DecorationManager: applyToEditor com hoverMessage', () => {
  const mgr = new DecorationManager();
  const decoratedOpts: any[] = [];
  const mockEditor = {
    document: { uri: vscode.Uri.file('/test/z.pks') },
    setDecorations: (_type: any, opts: any[]) => {
      decoratedOpts.push(...opts);
    },
  };

  mgr.applyToEditor(mockEditor as any, [{ line: 3, status: 'passed', message: 'OK 10ms' }]);
  assert.strictEqual(decoratedOpts.length, 1);
  assert.ok(decoratedOpts[0].hoverMessage);
});

test('DecorationManager: desabilitado via config nao aplica', () => {
  __setConfigValue('decorations.enabled', false);
  const mgr = new DecorationManager();
  const decoratedCalls: any[] = [];
  const mockEditor = {
    document: { uri: vscode.Uri.file('/test/w.pks') },
    setDecorations: (_type: any, _opts: any[]) => {
      decoratedCalls.push({});
    },
  };
  __setVisibleEditors([mockEditor]);

  const controller = {
    items: new Map([
      [
        'suite:x',
        {
          id: 'suite:x',
          uri: vscode.Uri.file('/test/w.pks'),
          range: new vscode.Range(1, 0, 1, 0),
          children: new Map(),
        },
      ],
    ]),
  };
  mgr.update(new Map([['suite:x', { status: 'failed' }]]), controller as any);
  assert.strictEqual(mgr.hasResults(), false);
  assert.strictEqual(decoratedCalls.length, 0);

  __setVisibleEditors([]);
});
