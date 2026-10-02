import assert from 'node:assert';
import { test } from 'node:test';
import { coverageToggleText, effectiveCoverage } from '../../coverageDecision';

// PRD-54: decisão de cobertura (pura, sem vscode).

test('effectiveCoverage: explícito true vence o modo global desligado', () => {
  assert.strictEqual(effectiveCoverage(true, false), true);
});

test('effectiveCoverage: explícito false vence o modo global ligado', () => {
  assert.strictEqual(effectiveCoverage(false, true), false);
});

test('effectiveCoverage: ausente (undefined) segue o modo global', () => {
  assert.strictEqual(effectiveCoverage(undefined, true), true);
  assert.strictEqual(effectiveCoverage(undefined, false), false);
});

test('coverageToggleText: ligado usa check e tooltip "on"', () => {
  const t = coverageToggleText(true, {
    on: 'on',
    off: 'off',
    onTooltip: 'tooltip on',
    offTooltip: 'tooltip off',
  });
  assert.strictEqual(t.text, '$(beaker) $(check) Coverage: on');
  assert.strictEqual(t.tooltip, 'tooltip on');
});

test('coverageToggleText: desligado usa só o beaker e tooltip "off"', () => {
  const t = coverageToggleText(false, {
    on: 'on',
    off: 'off',
    onTooltip: 'tooltip on',
    offTooltip: 'tooltip off',
  });
  assert.strictEqual(t.text, '$(beaker) Coverage: off');
  assert.strictEqual(t.tooltip, 'tooltip off');
});
