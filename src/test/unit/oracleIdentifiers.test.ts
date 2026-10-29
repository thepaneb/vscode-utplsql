import './setup.js';
import assert from 'node:assert';
import { afterEach, test } from 'node:test';
import { setLogSink } from '../../logger';
import {
  isValidSchemaPrefix,
  SCHEMA_PREFIX_RE,
  sanitizeSchemaPrefix,
} from '../../oracleIdentifiers';

afterEach(() => setLogSink(undefined));

test('isValidSchemaPrefix: aceita vazio e identificadores Oracle OWNER.', () => {
  for (const value of ['', 'UT3.', 'APP.', 'A$B.', 'A#B.', 'A_1.', 'UT3_2.']) {
    assert.strictEqual(isValidSchemaPrefix(value), true, value);
  }
});

test('isValidSchemaPrefix: rejeita valores fora do padrão', () => {
  for (const value of [
    'ut3.',
    'UT3',
    'UT3..',
    '.UT3',
    'UT 3.',
    'UT3. ',
    ' UT3.',
    '"UT3".',
    'UT3;',
    'UT3--',
    'UT3.\n',
    'A-B.',
    'A/B.',
    'A"B.',
    'A;B.',
  ]) {
    assert.strictEqual(isValidSchemaPrefix(value), false, value);
  }
});

test('isValidSchemaPrefix: regex exposta corresponde ao contrato', () => {
  assert.strictEqual(SCHEMA_PREFIX_RE.source, '^[A-Z0-9_$#]+\\.$');
});

test('sanitizeSchemaPrefix: válido passa intacto; ausente vira vazio', () => {
  assert.strictEqual(sanitizeSchemaPrefix('UT3.'), 'UT3.');
  assert.strictEqual(sanitizeSchemaPrefix(''), '');
  assert.strictEqual(sanitizeSchemaPrefix(undefined), '');
  assert.strictEqual(sanitizeSchemaPrefix(null), '');
});

test('sanitizeSchemaPrefix: inválido vira vazio e loga só o tamanho', () => {
  const logs: Array<{ level: string; msg: string; ctx?: Record<string, unknown> }> = [];
  setLogSink((level, msg, ctx) => logs.push({ level, msg, ctx }));
  const hostile = 'UT3"; DROP TABLE X; --';

  assert.strictEqual(sanitizeSchemaPrefix(hostile), '');
  assert.strictEqual(logs.length, 1);
  assert.strictEqual(logs[0].level, 'warn');
  assert.strictEqual(logs[0].ctx?.length, hostile.length);
  // O valor cru nunca é ecoado (nem no ctx, nem na mensagem).
  assert.ok(!JSON.stringify(logs).includes('DROP TABLE'));
  assert.ok(!JSON.stringify(logs).includes(hostile));
});
