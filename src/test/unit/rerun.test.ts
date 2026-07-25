import './setup.js';
import assert from 'node:assert';
import { test } from 'node:test';
import { parseCodeLensItems } from '../../codelens';

function findAnnotationAtLine(text: string, cursorLine: number) {
  const items = parseCodeLensItems(text);
  let best: (typeof items)[0] | undefined;
  for (const item of items) {
    if (item.line <= cursorLine && (!best || item.line > best.line)) {
      best = item;
    }
  }
  return best;
}

const pksFixture = `CREATE OR REPLACE PACKAGE test_math IS
  --%suite(Math operations)

  --%test(Adds two numbers)
  PROCEDURE adds_two_numbers;

  --%test(Divides by zero)
  PROCEDURE divide_by_zero;
END;`;

test('findAnnotationAtLine: cursor na linha do %suite', () => {
  const result = findAnnotationAtLine(pksFixture, 1);
  assert.ok(result);
  assert.strictEqual(result.type, 'suite');
  assert.strictEqual(result.description, 'Math operations');
  assert.strictEqual(result.packageName, 'test_math');
});

test('findAnnotationAtLine: cursor na linha do %test', () => {
  const result = findAnnotationAtLine(pksFixture, 3);
  assert.ok(result);
  assert.strictEqual(result.type, 'test');
  assert.strictEqual(result.description, 'Adds two numbers');
  assert.strictEqual(result.procName, 'adds_two_numbers');
});

test('findAnnotationAtLine: cursor na linha da procedure encontra %test acima', () => {
  const result = findAnnotationAtLine(pksFixture, 4);
  assert.ok(result);
  assert.strictEqual(result.type, 'test');
  assert.strictEqual(result.description, 'Adds two numbers');
});

test('findAnnotationAtLine: cursor antes do primeiro %suite retorna undefined', () => {
  const result = findAnnotationAtLine(pksFixture, 0);
  assert.strictEqual(result, undefined);
});

test('findAnnotationAtLine: cursor no segundo %test retorna o %test correto', () => {
  const result = findAnnotationAtLine(pksFixture, 6);
  assert.ok(result);
  assert.strictEqual(result.description, 'Divides by zero');
  assert.strictEqual(result.procName, 'divide_by_zero');
});
