import './setup.js';
import assert from 'node:assert';
import { test } from 'node:test';
import { parseSourceUri, virtualSourceUri } from '../../virtualSource';
import { Uri } from '../vscode-stub';

test('virtualSourceUri: com e sem schema', () => {
  assert.strictEqual(
    virtualSourceUri('app', 'ut_orders', 'pkb').toString(),
    'utplsql-source:/APP/UT_ORDERS.pkb',
  );
  assert.strictEqual(virtualSourceUri('', 'calc', 'sql').toString(), 'utplsql-source:/CALC.sql');
});

test('parseSourceUri: schema, objeto, ext e line', () => {
  const u = Uri.parse('utplsql-source:/APP/UT_ORDERS.pkb?line=42') as never;
  assert.deepStrictEqual(parseSourceUri(u), {
    schema: 'APP',
    object: 'UT_ORDERS',
    ext: 'pkb',
    line: 42,
  });
});

test('parseSourceUri: sem schema e sem extensão cai em .sql', () => {
  const u = Uri.parse('utplsql-source:/CALC') as never;
  assert.deepStrictEqual(parseSourceUri(u), {
    schema: '',
    object: 'CALC',
    ext: 'sql',
    line: undefined,
  });
});
