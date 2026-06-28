import { test } from 'node:test';
import assert from 'node:assert';
import { parseSuiteText } from '../../suiteParser';

const PKS = `
CREATE OR REPLACE PACKAGE test_calcular_desconto IS

    -- %suite(Testes da function calcular_desconto)

    -- %test(Aplica 10% de desconto corretamente)
    PROCEDURE desconto_de_10_porcento;

    -- %test(Lanca erro quando o valor e nulo)
    -- %throws(-20001)
    PROCEDURE valor_nulo_lanca_erro;

END test_calcular_desconto;
/
`;

test('extrai nome do package e descrição da suite', () => {
  const s = parseSuiteText(PKS);
  assert.ok(s, 'deveria reconhecer a suite');
  assert.strictEqual(s!.packageName, 'test_calcular_desconto');
  assert.strictEqual(s!.suiteDescription, 'Testes da function calcular_desconto');
});

test('extrai os testes com descrição e procedure', () => {
  const s = parseSuiteText(PKS)!;
  assert.strictEqual(s.tests.length, 2);

  assert.strictEqual(s.tests[0].procName, 'desconto_de_10_porcento');
  assert.strictEqual(s.tests[0].description, 'Aplica 10% de desconto corretamente');

  assert.strictEqual(s.tests[1].procName, 'valor_nulo_lanca_erro');
  assert.strictEqual(s.tests[1].description, 'Lanca erro quando o valor e nulo');
});

test('ignora arquivo sem %suite', () => {
  const naoSuite = `CREATE OR REPLACE PACKAGE pkg_qualquer IS PROCEDURE foo; END;`;
  assert.strictEqual(parseSuiteText(naoSuite), null);
});

test('suporta CREATE PACKAGE BODY e schema qualificado', () => {
  const body = `
    CREATE OR REPLACE PACKAGE BODY hr.test_x IS
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
