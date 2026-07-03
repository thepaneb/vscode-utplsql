import assert from 'node:assert';
import { test } from 'node:test';
import { readConfig } from '../../config';

test('readConfig: defaults sao usados quando sem config', () => {
  const cfg = readConfig();
  assert.strictEqual(cfg.cliPath, 'utplsql');
  assert.strictEqual(cfg.sourcePath, 'install');
  assert.strictEqual(cfg.invocation, 'launcher');
  assert.strictEqual(cfg.javaPath, 'java');
  assert.strictEqual(cfg.coverageOwner, '');
  assert.strictEqual(cfg.includePatterns.length, 1);
  assert.strictEqual(cfg.includePatterns[0], '**/*.pks');
});

test('readConfig: valores customizados sao lidos via vscode.getConfiguration', () => {
  const cfg = readConfig();
  assert.strictEqual(cfg.cliPath, 'utplsql');
  assert.strictEqual(cfg.extraRunArgs.length, 0);
});
