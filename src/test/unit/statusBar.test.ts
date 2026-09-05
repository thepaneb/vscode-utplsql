import './setup.js';
import assert from 'node:assert';
import { test } from 'node:test';
import { formatResults, UtplsqlStatusBar } from '../../statusBar';
import { __setConfigValue } from '../../test/vscode-stub';

test('formatResults: todos pass', () => {
  const fmt = formatResults(4, 0, 0, 0, 2500);
  assert.strictEqual(fmt.icon, '$(testing-passed)');
  assert.match(fmt.text, /4\/4/);
  assert.match(fmt.text, /2\.5s/);
  assert.match(fmt.tooltip, /4 aprovados/);
});

test('formatResults: com falhas', () => {
  const fmt = formatResults(3, 2, 0, 0, 5100);
  assert.strictEqual(fmt.icon, '$(testing-failed)');
  assert.match(fmt.text, /3\/5/);
  assert.match(fmt.text, /5\.1s/);
  assert.match(fmt.tooltip, /3 aprovados/);
  assert.match(fmt.tooltip, /2 falhas/);
});

test('formatResults: com erros', () => {
  const fmt = formatResults(0, 0, 0, 2, 1000);
  assert.strictEqual(fmt.icon, '$(testing-failed)');
  assert.match(fmt.text, /0\/2/);
  assert.match(fmt.tooltip, /2 erros/);
});

test('formatResults: com skipped', () => {
  const fmt = formatResults(5, 1, 2, 0, 3000);
  assert.strictEqual(fmt.icon, '$(testing-failed)');
  assert.match(fmt.text, /5\/8/);
  assert.match(fmt.tooltip, /5 aprovados/);
  assert.match(fmt.tooltip, /2 pulados/);
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

test('UtplsqlStatusBar: showIdle seta texto e tooltip', () => {
  __setConfigValue('statusBar.enabled', true);
  const sb = new UtplsqlStatusBar();
  assert.doesNotThrow(() => sb.showIdle());
  sb.dispose();
});

test('UtplsqlStatusBar: showRunning atualiza texto', () => {
  __setConfigValue('statusBar.enabled', true);
  const sb = new UtplsqlStatusBar();
  assert.doesNotThrow(() => sb.showRunning(2, 5));
  sb.dispose();
});

test('UtplsqlStatusBar: showResults atualiza com resultados', () => {
  __setConfigValue('statusBar.enabled', true);
  const sb = new UtplsqlStatusBar();
  assert.doesNotThrow(() => sb.showResults(3, 1, 0, 0, 5000));
  sb.dispose();
});

test('UtplsqlStatusBar: desabilitado via config nao mostra', () => {
  __setConfigValue('statusBar.enabled', false);
  const sb = new UtplsqlStatusBar();
  // nao deve lancar erro, mas tambem nao deve chamar show
  assert.doesNotThrow(() => {
    sb.showIdle();
    sb.showRunning(1, 1);
    sb.showResults(0, 0, 0, 0, 0);
  });
  sb.dispose();
});

test('UtplsqlStatusBar: dispose nao lanca erro', () => {
  __setConfigValue('statusBar.enabled', true);
  const sb = new UtplsqlStatusBar();
  assert.doesNotThrow(() => sb.dispose());
});
