import './setup.js';
import assert from 'node:assert';
import { test } from 'node:test';
import { readConfig } from '../../config';
import { type ConfigWarning, validateConfig } from '../../configValidation';

function base() {
  return readConfig();
}

test('validateConfig: snapshot válido não gera warnings', () => {
  const warnings: ConfigWarning[] = [];
  const out = validateConfig(base(), (w) => warnings.push(w));
  assert.deepStrictEqual(warnings, []);
  assert.strictEqual(out.oraclePoolMax, 10);
});

test('validateConfig: número inválido cai no default e avisa', () => {
  const warnings: ConfigWarning[] = [];
  const out = validateConfig(
    { ...base(), timeoutMinutes: Number.NaN, autoRunDelayMs: '500' as never },
    (w) => warnings.push(w),
  );
  assert.strictEqual(out.timeoutMinutes, 60);
  assert.strictEqual(out.autoRunDelayMs, 500);
  assert.deepStrictEqual(
    warnings.map((w) => w.setting),
    ['timeoutMinutes', 'autoRunDelayMs'],
  );
});

test('validateConfig: pool max clampa em 2 e min nunca passa do max', () => {
  const warnings: ConfigWarning[] = [];
  const out = validateConfig({ ...base(), oraclePoolMax: 1, oraclePoolMin: 9 }, (w) =>
    warnings.push(w),
  );
  assert.strictEqual(out.oraclePoolMax, 2);
  assert.strictEqual(out.oraclePoolMin, 2);
  assert.strictEqual(warnings.length, 2);
});

test('validateConfig: enum inválido cai no default', () => {
  const warnings: ConfigWarning[] = [];
  const out = validateConfig(
    { ...base(), organization: 'owner' as never, oracleClientMode: 'oci' as never },
    (w) => warnings.push(w),
  );
  assert.strictEqual(out.organization, 'file');
  assert.strictEqual(out.oracleClientMode, 'thin');
  assert.deepStrictEqual(
    warnings.map((w) => w.setting),
    ['oracleClientMode', 'organization'],
  );
});

test('validateConfig: regex inválida vira string vazia', () => {
  const warnings: ConfigWarning[] = [];
  const out = validateConfig({ ...base(), coverageIncludeObjectExpr: '[unclosed' }, (w) =>
    warnings.push(w),
  );
  assert.strictEqual(out.coverageIncludeObjectExpr, '');
  assert.strictEqual(warnings[0]?.setting, 'coverage.includeObjectExpr');
});

test('validateConfig: arrays descartam itens não-string', () => {
  const warnings: ConfigWarning[] = [];
  const out = validateConfig({ ...base(), includePatterns: ['**/*.pks', 42 as never] }, (w) =>
    warnings.push(w),
  );
  assert.deepStrictEqual(out.includePatterns, ['**/*.pks']);
  assert.deepStrictEqual(warnings, []);
});

test('validateConfig: array inválido cai no default', () => {
  const warnings: ConfigWarning[] = [];
  const out = validateConfig({ ...base(), coverageSchemes: 'APP' as never }, (w) =>
    warnings.push(w),
  );
  assert.deepStrictEqual(out.coverageSchemes, []);
  assert.strictEqual(warnings[0]?.setting, 'coverage.schemes');
});

test('validateConfig: booleano inválido cai no default', () => {
  const warnings: ConfigWarning[] = [];
  const out = validateConfig({ ...base(), dbmsOutput: 'yes' as never }, (w) => warnings.push(w));
  assert.strictEqual(out.dbmsOutput, false);
  assert.strictEqual(warnings[0]?.setting, 'dbmsOutput');
});

test('validateConfig: idioma desconhecido vira auto', () => {
  const warnings: ConfigWarning[] = [];
  const out = validateConfig({ ...base(), language: 'xx' as never }, (w) => warnings.push(w));
  assert.strictEqual(out.language, 'auto');
  assert.strictEqual(warnings[0]?.setting, 'language');
});

test('validateConfig: valores válidos são preservados', () => {
  const out = validateConfig(
    {
      ...base(),
      timeoutMinutes: 0,
      oraclePoolMax: 8,
      oraclePoolMin: 3,
      organization: 'schema',
      language: 'en',
      coverageIncludeSchemaExpr: '^APP$',
    },
    () => assert.fail('não deveria avisar'),
  );
  assert.strictEqual(out.timeoutMinutes, 0);
  assert.strictEqual(out.oraclePoolMax, 8);
  assert.strictEqual(out.oraclePoolMin, 3);
  assert.strictEqual(out.organization, 'schema');
  assert.strictEqual(out.language, 'en');
  assert.strictEqual(out.coverageIncludeSchemaExpr, '^APP$');
});
