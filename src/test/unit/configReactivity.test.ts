import './setup.js';
import assert from 'node:assert';
import { test } from 'node:test';
import { classifyConfigChange } from '../../configReactivity';

function affects(...sections: string[]) {
  return (section: string) =>
    sections.some(
      (s) => section === s || section.startsWith(`${s}.`) || s.startsWith(`${section}.`),
    );
}

test('configReactivity: mudança de organização/patterns atualiza a árvore', () => {
  const actions = classifyConfigChange(affects('utplsql.organization'));
  assert.strictEqual(actions.refreshTree, true);
  assert.strictEqual(actions.rebuildWatcher, false);
  assert.strictEqual(actions.rebuildCodeLens, false);
  assert.strictEqual(actions.invalidatePool, true);
});

test('configReactivity: languageIds/files.associations recriam CodeLens e watcher', () => {
  const actions = classifyConfigChange(affects('files.associations'));
  assert.strictEqual(actions.rebuildCodeLens, true);
  assert.strictEqual(actions.rebuildWatcher, true);
  assert.strictEqual(actions.refreshTree, true);
});

test('configReactivity: settings fora de utplsql não mexem no pool', () => {
  const actions = classifyConfigChange(affects('editor.tabSize'));
  assert.deepStrictEqual(actions, {
    invalidateConfigCache: false,
    rebuildCodeLens: false,
    rebuildWatcher: false,
    refreshTree: false,
    invalidatePool: false,
    resetSetupValidation: false,
    recomputeTrace: false,
  });
});

test('configReactivity: sqldeveloper TNS invalida só o cache de config', () => {
  const actions = classifyConfigChange(affects('sqldeveloper.connections.tnsConfiguration.path'));
  assert.strictEqual(actions.invalidateConfigCache, true);
  assert.strictEqual(actions.invalidatePool, false);
});
