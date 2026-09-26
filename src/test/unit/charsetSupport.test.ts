import './setup.js';
import assert from 'node:assert';
import { test } from 'node:test';
import { euroPreservedFromDump } from '../../charsetSupport';

test('euroPreservedFromDump: UTF-8 correto (AL32UTF8) é preservado', () => {
  assert.strictEqual(euroPreservedFromDump(['Typ=1 Len=3: 226,130,172']), true);
  assert.strictEqual(euroPreservedFromDump('Typ=1 Len=3: 226,130,172'), true);
});

test('euroPreservedFromDump: WE8DEC degrada para 1 byte (191)', () => {
  assert.strictEqual(euroPreservedFromDump(['Typ=1 Len=1: 191']), false);
});

test('euroPreservedFromDump: entradas inválidas retornam false', () => {
  assert.strictEqual(euroPreservedFromDump(null), false);
  assert.strictEqual(euroPreservedFromDump(undefined), false);
  assert.strictEqual(euroPreservedFromDump('lixo'), false);
  assert.strictEqual(euroPreservedFromDump([]), false);
});

test('euroPreservedFromDump: 3 bytes mas não é UTF-8 de € retorna false', () => {
  assert.strictEqual(euroPreservedFromDump(['Typ=1 Len=3: 1,2,3']), false);
});

test('euroPreservedFromDump: tolera espaços/maiúsculas no dump', () => {
  assert.strictEqual(euroPreservedFromDump('TYP=1 LEN=3:  226, 130, 172'), true);
});
