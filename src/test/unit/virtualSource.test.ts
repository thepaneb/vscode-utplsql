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

test('parseSourceUri: path ausente/vazio não lança e cai em defaults', () => {
  assert.deepStrictEqual(parseSourceUri({ path: undefined, query: '' } as never), {
    schema: '',
    object: '',
    ext: 'sql',
    line: undefined,
  });
  assert.deepStrictEqual(parseSourceUri({ path: '', query: 'line=7' } as never), {
    schema: '',
    object: '',
    ext: 'sql',
    line: 7,
  });
});

test('parseSourceUri: usa uri.query quando separado do path', () => {
  const u = {
    path: '/APP/O.sql',
    query: 'line=7',
    scheme: 'utplsql-source',
    toString: () => 'utplsql-source:/APP/O.sql?line=7',
  } as never;
  assert.deepStrictEqual(parseSourceUri(u), {
    schema: 'APP',
    object: 'O',
    ext: 'sql',
    line: 7,
  });
});
