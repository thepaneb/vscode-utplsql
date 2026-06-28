import { test } from 'node:test';
import assert from 'node:assert';
import { parseJUnit } from '../../junit';

const XML = `<?xml version="1.0" encoding="UTF-8"?>
<testsuites tests="3" failures="1" errors="0">
  <testsuite name="test_calcular_desconto" tests="3">
    <testcase classname="hr.test_calcular_desconto" name="Aplica 10% de desconto corretamente" time="0.05"/>
    <testcase classname="hr.test_calcular_desconto" name="Lanca erro quando o valor e nulo" time="0.02">
      <failure message="Expected 90 but got 80" type="failure">at line 12</failure>
    </testcase>
    <testcase classname="hr.test_calcular_desconto" name="Teste pulado" time="0">
      <skipped/>
    </testcase>
  </testsuite>
</testsuites>`;

test('faz parse de todos os testcases', () => {
  const cases = parseJUnit(XML);
  assert.strictEqual(cases.length, 3);
});

test('marca passou/falhou/pulado corretamente', () => {
  const cases = parseJUnit(XML);
  assert.strictEqual(cases[0].status, 'passed');
  assert.strictEqual(cases[1].status, 'failed');
  assert.strictEqual(cases[2].status, 'skipped');
});

test('captura mensagem de falha e duração', () => {
  const cases = parseJUnit(XML);
  assert.match(cases[1].message ?? '', /Expected 90 but got 80/);
  assert.strictEqual(cases[0].durationMs, 50);
  assert.strictEqual(cases[0].classname, 'hr.test_calcular_desconto');
});

test('lida com testsuite único (não-array)', () => {
  const single = `<testsuites><testsuite name="s"><testcase classname="s" name="t" time="0.01"/></testsuite></testsuites>`;
  const cases = parseJUnit(single);
  assert.strictEqual(cases.length, 1);
  assert.strictEqual(cases[0].status, 'passed');
});
