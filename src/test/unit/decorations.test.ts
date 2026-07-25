import './setup.js';
import assert from 'node:assert';
import { test } from 'node:test';
import * as vscode from 'vscode';
import { DecorationManager } from '../../decorations';
import { __setConfigValue } from '../../test/vscode-stub';

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
