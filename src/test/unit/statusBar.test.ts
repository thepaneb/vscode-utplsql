import './setup.js';
import assert from 'node:assert';
import { test } from 'node:test';
import { formatResults } from '../../statusBar';

test('formatResults: todos pass', () => {
  const fmt = formatResults(4, 0, 0, 0, 2500);
  assert.strictEqual(fmt.icon, '$(testing-passed)');
  assert.match(fmt.text, /4\/4/);
  assert.match(fmt.text, /2\.5s/);
  assert.match(fmt.tooltip, /4 passed/);
});

test('formatResults: com falhas', () => {
  const fmt = formatResults(3, 2, 0, 0, 5100);
  assert.strictEqual(fmt.icon, '$(testing-failed)');
  assert.match(fmt.text, /3\/5/);
  assert.match(fmt.text, /5\.1s/);
  assert.match(fmt.tooltip, /3 passed/);
  assert.match(fmt.tooltip, /2 failed/);
});

test('formatResults: com erros', () => {
  const fmt = formatResults(0, 0, 0, 2, 1000);
  assert.strictEqual(fmt.icon, '$(testing-failed)');
  assert.match(fmt.text, /0\/2/);
  assert.match(fmt.tooltip, /2 errored/);
});

test('formatResults: com skipped', () => {
  const fmt = formatResults(5, 1, 2, 0, 3000);
  assert.strictEqual(fmt.icon, '$(testing-failed)');
  assert.match(fmt.text, /5\/8/);
  assert.match(fmt.tooltip, /5 passed/);
  assert.match(fmt.tooltip, /2 skipped/);
});

test('formatResults: tooltip com duracao', () => {
  const fmt = formatResults(2, 1, 3, 0, 4200);
  assert.match(fmt.tooltip, /4\.2s/);
});

test('formatResults: zero testes', () => {
  const fmt = formatResults(0, 0, 0, 0, 0);
  assert.strictEqual(fmt.icon, '$(testing-passed)');
  assert.match(fmt.text, /0\/0/);
  assert.match(fmt.text, /0\.0s/);
});
