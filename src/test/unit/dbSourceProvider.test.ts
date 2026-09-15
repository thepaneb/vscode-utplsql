import './setup.js';
import assert from 'node:assert';
import { test } from 'node:test';
import { clearDbSourceCache, fetchDbSource, parseDbSourceUri } from '../../dbSourceProvider';
import { Uri } from '../vscode-stub';

test('parseDbSourceUri: extrai schema e package em maiúsculas', () => {
  const uri = Uri.parse('utplsql-db:/app/ut_orders.pks');
  assert.deepStrictEqual(parseDbSourceUri(uri as never), { schema: 'APP', pkg: 'UT_ORDERS' });
});

test('parseDbSourceUri: normaliza para maiúsculas e remove a extensão .pks', () => {
  const uri = Uri.parse('utplsql-db:/hr/ut_employees.PKS');
  assert.deepStrictEqual(parseDbSourceUri(uri as never), { schema: 'HR', pkg: 'UT_EMPLOYEES' });
});

test('parseDbSourceUri: sem segmentos retorna vazio', () => {
  assert.deepStrictEqual(parseDbSourceUri(Uri.parse('utplsql-db:/') as never), {
    schema: '',
    pkg: '',
  });
});

test('fetchDbSource: sem conexão resolvida retorna vazio', async () => {
  clearDbSourceCache();
  const text = await fetchDbSource(Uri.parse('utplsql-db:/APP/UT_PKG.pks') as never);
  assert.strictEqual(text, '');
});

test('fetchDbSource: uri sem package retorna vazio', async () => {
  const text = await fetchDbSource(Uri.parse('utplsql-db:/APP') as never);
  assert.strictEqual(text, '');
});

test('clearDbSourceCache: limpa sem lançar', () => {
  clearDbSourceCache();
});
