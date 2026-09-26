import assert from 'node:assert';
import { test } from 'node:test';
import { isUserFrame, parseJUnit, parseStackFrames } from '../../junit';

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

test('parseJUnit: failure tem precedência quando o testcase também tem error', () => {
  const xml = `<testsuites><testsuite name="s"><testcase classname="s" name="both" time="0.1">
    <failure message="falha">at "APP.PKG"."PROC", line 7</failure>
    <error message="erro">at "APP.PKG"."ERR", line 9</error>
  </testcase></testsuite></testsuites>`;
  const cases = parseJUnit(xml);
  assert.strictEqual(cases[0].status, 'failed');
  assert.match(cases[0].message ?? '', /falha/);
  assert.strictEqual(cases[0].stackFrames?.[0]?.objectName, 'APP.PKG');
  assert.strictEqual(cases[0].stackFrames?.[0]?.line, 7);
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

test('parseJUnit: failure tag auto-fechada sem message retorna string vazia', () => {
  const xml = `<testsuites><testsuite name="s"><testcase classname="s" name="f" time="0.1"><failure/></testcase></testsuite></testsuites>`;
  const cases = parseJUnit(xml);
  assert.strictEqual(cases[0].status, 'failed');
  assert.strictEqual(cases[0].message, '');
});

test('parseJUnit: failure sem message e sem texto retorna undefined (i18n no chamador)', () => {
  const xml = `<testsuites><testsuite name="s"><testcase classname="s" name="f" time="0.1"><failure dummy="x"/></testcase></testsuite></testsuites>`;
  const cases = parseJUnit(xml);
  assert.strictEqual(cases[0].status, 'failed');
  assert.strictEqual(cases[0].message, undefined);
});

test('parseJUnit: failure com message attr sem texto', () => {
  const xml = `<testsuites><testsuite name="s"><testcase classname="s" name="f" time="0.1"><failure message="Something wrong"/></testcase></testsuite></testsuites>`;
  const cases = parseJUnit(xml);
  assert.match(cases[0].message ?? '', /Something wrong/);
});

test('parseStackFrames: extrai frames de stack trace utPLSQL', () => {
  const body = 'at "UT3.APP_TESTS"."MY_PROC", line 42\nat "UT3.APP_TESTS"."ANOTHER", line 15';
  const frames = parseStackFrames(body);
  assert.ok(frames);
  assert.strictEqual(frames.length, 2);
  assert.strictEqual(frames[0].objectName, 'UT3.APP_TESTS');
  assert.strictEqual(frames[0].line, 42);
  assert.strictEqual(frames[1].objectName, 'UT3.APP_TESTS');
  assert.strictEqual(frames[1].line, 15);
});

test('parseStackFrames: string vazia retorna undefined', () => {
  assert.strictEqual(parseStackFrames(''), undefined);
});

test('parseStackFrames: corpo sem stack trace retorna undefined', () => {
  assert.strictEqual(parseStackFrames('Expected 1 but got 0'), undefined);
});

test('parseStackFrames: JUnit XML com stack trace nos testcases', () => {
  const xml = `<testsuites><testsuite name="s">
    <testcase classname="app.test_math" name="add" time="0.1">
      <failure message="Expected 1 but got 0">at "APP.TEST_MATH"."ADD", line 12
at "APP.TEST_MATH"."ASSERT_EQUALS", line 8</failure>
    </testcase>
  </testsuite></testsuites>`;
  const cases = parseJUnit(xml);
  assert.strictEqual(cases.length, 1);
  assert.ok(cases[0].stackFrames);
  assert.strictEqual(cases[0].stackFrames?.length, 2);
  assert.strictEqual(cases[0].stackFrames?.[0].objectName, 'APP.TEST_MATH');
  assert.strictEqual(cases[0].stackFrames?.[0].line, 12);
});

test('parseStackFrames: error tag tambem tem stack frames', () => {
  const xml = `<testsuites><testsuite name="s">
    <testcase classname="app.x" name="err" time="0.1">
      <error message="ORA-error">at "APP.X"."ERR_PROC", line 5</error>
    </testcase>
  </testsuite></testsuites>`;
  const cases = parseJUnit(xml);
  assert.strictEqual(cases.length, 1);
  assert.strictEqual(cases[0].status, 'error');
  assert.ok(cases[0].stackFrames);
  assert.strictEqual(cases[0].stackFrames?.length, 1);
});

test('isUserFrame: filtra frames internos UT_ e UT3_', () => {
  assert.strictEqual(isUserFrame({ objectName: 'UT_RUNNER', line: 10 }), false);
  assert.strictEqual(isUserFrame({ objectName: 'UT3.UT_SUITE_MANAGER', line: 5 }), false);
  assert.strictEqual(isUserFrame({ objectName: 'UT$HELPER', line: 1 }), false);
  assert.strictEqual(isUserFrame({ objectName: 'UT3_RUNNER', line: 1 }), false);
  assert.strictEqual(isUserFrame({ objectName: 'UT3$HELPER', line: 1 }), false);
});

test('isUserFrame: mantem frames de usuario', () => {
  assert.strictEqual(isUserFrame({ objectName: 'MY_PACKAGE', line: 42 }), true);
  assert.strictEqual(isUserFrame({ objectName: 'APP.TEST_MATH', line: 15 }), true);
});

test('isUserFrame: frame com line 0 e descartado', () => {
  assert.strictEqual(isUserFrame({ objectName: 'APP.X', line: 0 }), false);
});

test('parseJUnit: raiz sem testsuites (apenas testsuite) usa o doc', () => {
  const xml = '<testsuite name="pkg" tests="1"><testcase name="t1" time="0.05"/></testsuite>';
  const cases = parseJUnit(xml);
  assert.strictEqual(cases.length, 1);
  assert.strictEqual(cases[0].name, 't1');
});

test('parseJUnit: testcase sem classname herda o nome da suite', () => {
  const xml =
    '<testsuites><testsuite name="app"><testcase name="t1" time="0.05"/></testsuite></testsuites>';
  const cases = parseJUnit(xml);
  assert.strictEqual(cases[0].classname, 'app');
});

test('parseJUnit: testcase sem name resulta em vazio', () => {
  const xml =
    '<testsuites><testsuite name="app"><testcase classname="pkg" time="0.05"/></testsuite></testsuites>';
  const cases = parseJUnit(xml);
  assert.strictEqual(cases[0].name, '');
});

test('parseJUnit: tempo não numérico resulta em durationMs undefined', () => {
  const xml =
    '<testsuites><testsuite name="app"><testcase classname="pkg" name="t1" time="abc"/></testsuite></testsuites>';
  const cases = parseJUnit(xml);
  assert.strictEqual(cases[0].durationMs, undefined);
});

test('parseJUnit: testcase e suite sem name/classname resultam vazio', () => {
  const xml = '<testsuites><testsuite tests="1"><testcase time="0.05"/></testsuite></testsuites>';
  const cases = parseJUnit(xml);
  assert.strictEqual(cases[0].classname, '');
  assert.strictEqual(cases[0].name, '');
});

test('parseStackFrames: frame sem aspas usa grupo unquoted', () => {
  const body = 'at APP.CALC, line 42\n';
  const frames = parseStackFrames(body);
  assert.ok(frames);
  assert.strictEqual(frames?.[0]?.objectName, 'APP.CALC');
  assert.strictEqual(frames?.[0]?.line, 42);
});

test('parseStackFrames: frame unquoted malformado é ignorado', () => {
  assert.strictEqual(parseStackFrames('at APP-CALC, line 42'), undefined);
  assert.strictEqual(parseStackFrames('at APP.CALC, line nao-numero'), undefined);
});

// ── Formato real do utPLSQL ────────────────────────────────────────────────
// O ut_junit_reporter aninha <testsuite> por nível de schema quando a suite tem
// --%suitepath (instalação compartilhada: utPLSQL em UT3, testes em outro
// schema) e emite o stack frame com o NOME ÚNICO qualificado
// (schema.package.procedure), não o formato `at "OBJ"."PROC"` do
// DBMS_UTILITY. Ambos vinham de uma execução real (fatia E2E de jump-to-failure).
const NESTED_XML = `<?xml version="1.0"?>
<testsuites tests="1" disabled="0" errors="0" failures="1" name="" time=".013388" >
<testsuite tests="1" id="1" package="utplsql_test"  disabled="0" errors="0" failures="1" name="utplsql_test" time=".012" >
<testsuite tests="1" id="2" package="utplsql_test.test_math_fail"  disabled="0" errors="0" failures="1" name="Math failures" time=".011" >
<testcase classname="utplsql_test.test_math_fail" assertions="1" name="Expects 1 to equal 2" time=".013388"  status="Failure">
<failure>
<![CDATA[
Actual: 1 (number) was expected to equal: 2 (number)
at "UT3.TEST_MATH_FAIL.EXPECTS_ONE_TO_EQUAL_TWO", line 4 ut3.ut.expect(1).to_equal(2);
]]>
</failure>
<system-out/>
<system-err/>
</testcase>
<system-out/>
<system-err/>
</testsuite>
<system-out/>
<system-err/>
</testsuite>
</testsuites>`;

test('parseJUnit: percorre testsuite aninhado (%suitepath) e devolve o testcase interno', () => {
  const cases = parseJUnit(NESTED_XML);
  assert.strictEqual(cases.length, 1);
  assert.strictEqual(cases[0].classname, 'utplsql_test.test_math_fail');
  assert.strictEqual(cases[0].name, 'Expects 1 to equal 2');
  assert.strictEqual(cases[0].status, 'failed');
  assert.match(cases[0].message ?? '', /was expected to equal: 2/);
});

test('parseJUnit: percorre testesuite aninhado em vários níveis', () => {
  const xml = `<testsuites>
    <testsuite name="l1">
      <testsuite name="l2">
        <testsuite name="l3">
          <testcase classname="a.b.c" name="deep" time="0.1"/>
        </testsuite>
        <testcase classname="a.b" name="mid" time="0.1"/>
      </testsuite>
      <testcase classname="a" name="top" time="0.1"/>
    </testsuite>
  </testsuites>`;
  const cases = parseJUnit(xml);
  assert.deepStrictEqual(
    cases.map((c) => c.name),
    ['top', 'mid', 'deep'],
  );
});

test('parseJUnit: testcase do nível externo vem antes dos aninhados', () => {
  const xml = `<testsuites>
    <testsuite name="outer">
      <testcase classname="outer" name="a" time="0.1"/>
      <testsuite name="inner">
        <testcase classname="inner" name="b" time="0.1"/>
      </testsuite>
    </testsuite>
  </testsuites>`;
  const cases = parseJUnit(xml);
  assert.deepStrictEqual(
    cases.map((c) => c.name),
    ['a', 'b'],
  );
});

test('parseJUnit: aninhado com error e skipped também é lido', () => {
  const xml = `<testsuites>
    <testsuite name="pkg">
      <testsuite name="suite">
        <testcase classname="pkg.suite" name="e" time="0.1"><error message="ORA-00942"/></testcase>
        <testcase classname="pkg.suite" name="s" time="0.1"><skipped/></testcase>
      </testsuite>
    </testsuite>
  </testsuites>`;
  const cases = parseJUnit(xml);
  assert.deepStrictEqual(
    cases.map((c) => c.status),
    ['error', 'skipped'],
  );
});

test('parseStackFrames: aceita o frame real do utPLSQL (nome único qualificado)', () => {
  const body =
    'Actual: 1 (number) was expected to equal: 2 (number)\n' +
    'at "UT3.TEST_MATH_FAIL.EXPECTS_ONE_TO_EQUAL_TWO", line 4 ut3.ut.expect(1).to_equal(2);';
  const frames = parseStackFrames(body);
  assert.ok(frames);
  assert.strictEqual(frames.length, 1);
  assert.strictEqual(frames[0].objectName, 'UT3.TEST_MATH_FAIL.EXPECTS_ONE_TO_EQUAL_TWO');
  assert.strictEqual(frames[0].line, 4);
});

test('parseStackFrames: frame real dentro do failure aninhado vira stackFrames', () => {
  const cases = parseJUnit(NESTED_XML);
  const frames = cases[0].stackFrames;
  assert.ok(frames);
  assert.strictEqual(frames[0].objectName, 'UT3.TEST_MATH_FAIL.EXPECTS_ONE_TO_EQUAL_TWO');
  assert.strictEqual(frames[0].line, 4);
});

test('isUserFrame: frame do usuário no schema de instalação é aceito', () => {
  // Instalo próprio: o schema do usuário É o schema de instalação (UT3), então
  // o frame do teste também vem prefixado com UT3. e não pode ser descartado.
  assert.strictEqual(
    isUserFrame({ objectName: 'UT3.TEST_MATH_FAIL.EXPECTS_ONE_TO_EQUAL_TWO', line: 4 }),
    true,
  );
  assert.strictEqual(isUserFrame({ objectName: 'UT3.MY_APP.P', line: 7 }), true);
});

test('isUserFrame: frame do framework é rejeitado mesmo qualificado com o schema', () => {
  assert.strictEqual(isUserFrame({ objectName: 'UT3.UT_SUITE_MANAGER', line: 5 }), false);
  assert.strictEqual(isUserFrame({ objectName: 'UT3.UT_RUNNER', line: 151 }), false);
  assert.strictEqual(isUserFrame({ objectName: 'UT3.UT$HELPER', line: 2 }), false);
  assert.strictEqual(isUserFrame({ objectName: 'UT3.UT_ASSERT.ANY_PROC', line: 3 }), false);
});
