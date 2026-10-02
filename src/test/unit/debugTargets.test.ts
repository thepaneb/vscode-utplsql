import assert from 'node:assert';
import { test } from 'node:test';
import { resolveLastRunTarget, targetFromMeta } from '../../debugTargets';
import type { LastRunState } from '../../state';
import type { ItemMeta } from '../../types';

// PRD-53: resolução de alvo das variações de debug, pura (sem vscode).

function lastRun(over: Partial<LastRunState>): LastRunState {
  return { type: 'all', coverage: false, ...over };
}

test('resolveLastRunTarget: teste vira package + procedure', () => {
  const t = resolveLastRunTarget(
    lastRun({ type: 'test', packageName: 'UT_APP', procName: 't_um' }),
  );
  assert.deepStrictEqual(t, { packageName: 'UT_APP', procName: 't_um' });
});

test('resolveLastRunTarget: suite vira só o package', () => {
  const t = resolveLastRunTarget(lastRun({ type: 'suite', packageName: 'UT_APP' }));
  assert.deepStrictEqual(t, { packageName: 'UT_APP' });
});

test('resolveLastRunTarget: file vira só o package', () => {
  const t = resolveLastRunTarget(lastRun({ type: 'file', packageName: 'UT_APP' }));
  assert.deepStrictEqual(t, { packageName: 'UT_APP' });
});

test('resolveLastRunTarget: all devolve undefined (chamador usa picker)', () => {
  assert.strictEqual(resolveLastRunTarget(lastRun({ type: 'all' })), undefined);
});

test('resolveLastRunTarget: sem execução devolve undefined', () => {
  assert.strictEqual(resolveLastRunTarget(undefined), undefined);
});

test('resolveLastRunTarget: test sem procName cai para undefined', () => {
  assert.strictEqual(
    resolveLastRunTarget(lastRun({ type: 'test', packageName: 'UT_APP' })),
    undefined,
  );
});

test('targetFromMeta: meta de teste devolve package + proc', () => {
  const meta = { kind: 'test', packageName: 'UT_APP', procName: 't_um' } as ItemMeta;
  assert.deepStrictEqual(targetFromMeta(meta), { packageName: 'UT_APP', procName: 't_um' });
});

test('targetFromMeta: meta de suite devolve undefined', () => {
  assert.strictEqual(
    targetFromMeta({ kind: 'suite', packageName: 'UT_APP' } as ItemMeta),
    undefined,
  );
});

test('targetFromMeta: sem meta devolve undefined', () => {
  assert.strictEqual(targetFromMeta(undefined), undefined);
});
