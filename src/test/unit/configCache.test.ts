import './setup.js';
import assert from 'node:assert';
import { test } from 'node:test';
import { readConfig } from '../../config';
import { configGeneration, invalidateConfigCache, resetConfigCache } from '../../configCache';
import { __resetConfigValues, __setConfigValue } from '../vscode-stub';

test('readConfig: devolve o mesmo snapshot até a invalidação', () => {
  __resetConfigValues();
  resetConfigCache();
  const first = readConfig();
  const second = readConfig();
  assert.strictEqual(first, second);
});

test('readConfig: __setConfigValue invalida o snapshot', () => {
  __resetConfigValues();
  const before = readConfig();
  const generation = configGeneration();
  __setConfigValue('timeoutMinutes', 7);
  try {
    const after = readConfig();
    assert.notStrictEqual(after, before);
    assert.strictEqual(after.timeoutMinutes, 7);
    assert.ok(configGeneration() > generation);
  } finally {
    __resetConfigValues();
  }
});

test('invalidateConfigCache: reconstrói na próxima leitura', () => {
  __resetConfigValues();
  const before = readConfig();
  invalidateConfigCache();
  const after = readConfig();
  assert.notStrictEqual(after, before);
});
