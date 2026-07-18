import assert from 'node:assert';
import { test } from 'node:test';
import { TestStateManager } from '../../state';

test('TestStateManager: setMeta e getMeta', () => {
  const mgr = new TestStateManager();
  const item = { id: 'suite:app' } as any;
  const meta = {
    kind: 'suite' as const,
    packageName: 'app',
    uri: { fsPath: '/x' } as any,
    folder: { uri: { fsPath: '/ws' }, name: 'ws', index: 0 } as any,
  };
  mgr.setMeta(item, meta);
  assert.strictEqual(mgr.getMeta(item), meta);
});

test('TestStateManager: getMeta retorna undefined para item sem meta', () => {
  const mgr = new TestStateManager();
  assert.strictEqual(mgr.getMeta({ id: 'unknown' } as any), undefined);
});

test('TestStateManager: setCoverage e getCoverage', () => {
  const mgr = new TestStateManager();
  const details = [{ line: 1, hits: 2 } as any];
  mgr.setCoverage('file:///test.sql', details);
  assert.strictEqual(mgr.getCoverage('file:///test.sql'), details);
});

test('TestStateManager: getCoverate retorna array vazio para chave inexistente', () => {
  const mgr = new TestStateManager();
  assert.deepStrictEqual(mgr.getCoverage('file:///nonexistent'), []);
});

test('TestStateManager: clearCoverage limpa o store', () => {
  const mgr = new TestStateManager();
  mgr.setCoverage('file:///test.sql', [{ line: 1, hits: 2 } as any]);
  mgr.clearCoverage();
  assert.deepStrictEqual(mgr.getCoverage('file:///test.sql'), []);
});

test('TestStateManager: setExtraReporter armazena o valor', () => {
  const mgr = new TestStateManager();
  mgr.setExtraReporter('UT_COVERAGE_HTML_REPORTER');
  assert.strictEqual(mgr.extraReporter, 'UT_COVERAGE_HTML_REPORTER');
});

test('TestStateManager: consumeExtraReporter retorna o valor armazenado', () => {
  const mgr = new TestStateManager();
  mgr.setExtraReporter('UT_MY_CUSTOM');
  assert.strictEqual(mgr.consumeExtraReporter(), 'UT_MY_CUSTOM');
});

test('TestStateManager: consumeExtraReporter limpa apos consumo', () => {
  const mgr = new TestStateManager();
  mgr.setExtraReporter('UT_TEMP');
  mgr.consumeExtraReporter();
  assert.strictEqual(mgr.consumeExtraReporter(), undefined);
});

test('TestStateManager: consumeExtraReporter retorna undefined sem nada armazenado', () => {
  const mgr = new TestStateManager();
  assert.strictEqual(mgr.consumeExtraReporter(), undefined);
});
