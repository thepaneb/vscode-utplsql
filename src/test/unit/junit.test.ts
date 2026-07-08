import assert from 'node:assert';
import { test } from 'node:test';
import { parseJUnit } from '../../junit';

const XML = `<?xml version="1.0" encoding="UTF-8"?>
<testsuites tests="3" failures="1" errors="0">
  <testsuite name="test_exemplo" tests="3">
    <testcase classname="app.test_exemplo" name="Cenario de sucesso" time="0.05"/>
    <testcase classname="app.test_exemplo" name="Lanca erro quando o valor e invalido" time="0.02">
      <failure message="Expected 90 but got 80" type="failure">at line 12</failure>
    </testcase>
    <testcase classname="app.test_exemplo" name="Teste pulado" time="0">
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
  assert.strictEqual(cases[0].classname, 'app.test_exemplo');
});

test('lida com testsuite único (não-array)', () => {
  const single = `<testsuites><testsuite name="s"><testcase classname="s" name="t" time="0.01"/></testsuite></testsuites>`;
  const cases = parseJUnit(single);
  assert.strictEqual(cases.length, 1);
  assert.strictEqual(cases[0].status, 'passed');
});

test('parseJUnit: status error quando tem tag error', () => {
  const xml = `<testsuites><testsuite name="s"><testcase classname="s" name="e" time="0.1"><error message="erro">stack</error></testcase></testsuite></testsuites>`;
  const cases = parseJUnit(xml);
  assert.strictEqual(cases.length, 1);
  assert.strictEqual(cases[0].status, 'error');
  assert.match(cases[0].message ?? '', /erro/);
});

test('parseJUnit: sem classname usa name do testsuite', () => {
  const xml = `<testsuites><testsuite name="fallback_pkg"><testcase name="t1" time="0.1"/></testsuite></testsuites>`;
  const cases = parseJUnit(xml);
  assert.strictEqual(cases[0].classname, 'fallback_pkg');
});

test('parseJUnit: sem time retorna durationMs undefined', () => {
  const xml = `<testsuites><testsuite name="s"><testcase classname="s" name="t"/></testsuite></testsuites>`;
  const cases = parseJUnit(xml);
  assert.strictEqual(cases[0].durationMs, 0);
});

test('parseJUnit: multiplas suites', () => {
  const xml = `<testsuites>
    <testsuite name="s1"><testcase classname="s1" name="a" time="0.01"/></testsuite>
    <testsuite name="s2"><testcase classname="s2" name="b" time="0.02"/></testsuite>
  </testsuites>`;
  const cases = parseJUnit(xml);
  assert.strictEqual(cases.length, 2);
});

test('parseJUnit: extractMessage com atributo message e text', () => {
  const xml = `<testsuites><testsuite name="s"><testcase classname="s" name="f" time="0.1">
    <failure message="Falhou aqui">at line 42</failure>
  </testcase></testsuite></testsuites>`;
  const cases = parseJUnit(xml);
  assert.match(cases[0].message ?? '', /Falhou aqui/);
  assert.match(cases[0].message ?? '', /at line 42/);
});

test('parseJUnit: error tag com texto simples (sem atributos)', () => {
  const xml = `<testsuites><testsuite name="s"><testcase classname="s" name="e" time="0.1"><error>Erro na linha 5</error></testcase></testsuite></testsuites>`;
  const cases = parseJUnit(xml);
  assert.strictEqual(cases[0].status, 'error');
  assert.match(cases[0].message ?? '', /Erro na linha 5/);
});
