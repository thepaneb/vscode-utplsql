import { test } from 'node:test';
import assert from 'node:assert';
import { parseSuiteText } from '../../suiteParser';

const PKS = `
CREATE OR REPLACE PACKAGE test_exemplo IS

    -- %suite(Suite de exemplo)

    -- %test(Cenario de sucesso)
    PROCEDURE cenario_de_sucesso;

    -- %test(Lanca erro quando o valor e invalido)
    -- %throws(-20001)
    PROCEDURE valor_invalido_lanca_erro;

END test_exemplo;
/
`;

test('extrai nome do package e descrição da suite', () => {
  const s = parseSuiteText(PKS);
  assert.ok(s, 'deveria reconhecer a suite');
  assert.strictEqual(s!.packageName, 'test_exemplo');
  assert.strictEqual(s!.suiteDescription, 'Suite de exemplo');
});

test('extrai os testes com descrição e procedure', () => {
  const s = parseSuiteText(PKS)!;
  assert.strictEqual(s.tests.length, 2);

  assert.strictEqual(s.tests[0].procName, 'cenario_de_sucesso');
  assert.strictEqual(s.tests[0].description, 'Cenario de sucesso');

  assert.strictEqual(s.tests[1].procName, 'valor_invalido_lanca_erro');
  assert.strictEqual(s.tests[1].description, 'Lanca erro quando o valor e invalido');
});

test('ignora arquivo sem %suite', () => {
  const naoSuite = `CREATE OR REPLACE PACKAGE pkg_qualquer IS PROCEDURE foo; END;`;
  assert.strictEqual(parseSuiteText(naoSuite), null);
});

test('suporta CREATE PACKAGE BODY e schema qualificado', () => {
  const body = `
    CREATE OR REPLACE PACKAGE BODY app.test_x IS
      -- %suite
      -- %test(faz algo)
      PROCEDURE faz_algo;
    END;
  `;
  const s = parseSuiteText(body);
  assert.ok(s);
  assert.strictEqual(s!.packageName, 'test_x');
  assert.strictEqual(s!.tests.length, 1);
});
