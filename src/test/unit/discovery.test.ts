import assert from 'node:assert';
import { test } from 'node:test';
import { parseSuite } from '../../discovery';

const PKG = 'test_exemplo';
const PKS_CONTENT = `CREATE OR REPLACE PACKAGE ${PKG} IS
  -- %suite(Teste exemplo)
  -- %test(Cenario um)
  procedure cen_um;
END;`;

const NON_SUITE_PKG = `CREATE OR REPLACE PACKAGE pkg_qualquer IS
  procedure proc1;
END;`;

test('parseSuite: retorna SuiteFile com uri', () => {
  const uri = {
    fsPath: '/workspace/test_exemplo.pks',
    path: '/workspace/test_exemplo.pks',
    scheme: 'file',
  };
  const suite = parseSuite(uri as any, PKS_CONTENT);
  assert.ok(suite);
  assert.strictEqual(suite.packageName, PKG);
  assert.strictEqual(suite.suiteDescription, 'Teste exemplo');
  assert.strictEqual(suite.tests.length, 1);
  assert.strictEqual(suite.tests[0].procName, 'cen_um');
});

test('parseSuite: retorna null se nao for suite', () => {
  const uri = {
    fsPath: '/workspace/pkg_qualquer.pks',
    path: '/workspace/pkg_qualquer.pks',
    scheme: 'file',
  };
  assert.strictEqual(parseSuite(uri as any, NON_SUITE_PKG), null);
});
