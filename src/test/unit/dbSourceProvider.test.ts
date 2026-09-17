import './setup.js';
import assert from 'node:assert';
import { test } from 'node:test';
import {
  clearDbSourceCache,
  fetchDbSource,
  parseDbSourceUri,
  registerDbSourceProvider,
} from '../../dbSourceProvider';
import { closeOraclePool } from '../../oracleRunner';
import { __resetConfigValues, Uri, workspace } from '../vscode-stub';

type LoadedOracledb = typeof import('oracledb');

function fakeOracledb(
  conn: unknown,
  opts: { createPoolThrows?: boolean; getConnThrows?: boolean } = {},
): LoadedOracledb {
  return {
    OUT_FORMAT_OBJECT: {},
    createPool: async () => {
      if (opts.createPoolThrows) throw new Error('pool down');
      return { getConnection: async () => conn, close: async () => {} };
    },
    getConnection: async () => {
      if (opts.getConnThrows) throw new Error('conn down');
      return conn;
    },
  } as unknown as LoadedOracledb;
}

async function withConn(fn: () => Promise<void>): Promise<void> {
  const orig = process.env.UTPLSQL_CONN;
  process.env.UTPLSQL_CONN = 'u/p@//h:1521/s';
  try {
    await fn();
  } finally {
    process.env.UTPLSQL_CONN = orig;
    await closeOraclePool();
  }
}

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

test('fetchDbSource: loader indisponível retorna vazio', async () =>
  withConn(async () => {
    const text = await fetchDbSource(Uri.parse('utplsql-db:/APP/UT_PKG.pks') as never, async () => {
      return undefined;
    });
    assert.strictEqual(text, '');
  }));

test('fetchDbSource: mapeia rows em array e fecha a conexão', async () =>
  withConn(async () => {
    let closed = false;
    const conn = {
      execute: async () => ({ rows: [['linha 1'], ['linha 2']] }),
      close: async () => {
        closed = true;
      },
    };
    const text = await fetchDbSource(Uri.parse('utplsql-db:/app/ut_pkg.pks') as never, async () =>
      fakeOracledb(conn),
    );
    assert.strictEqual(text, 'linha 1\nlinha 2');
    assert.strictEqual(closed, true);
  }));

test('fetchDbSource: mapeia rows em objeto (OUT_FORMAT_OBJECT)', async () =>
  withConn(async () => {
    const conn = {
      execute: async () => ({ rows: [{ TEXT: 'a' }, { TEXT: 'b' }, { TEXT: null }] }),
      close: async () => {},
    };
    const text = await fetchDbSource(Uri.parse('utplsql-db:/app/ut_pkg.pks') as never, async () =>
      fakeOracledb(conn),
    );
    assert.strictEqual(text, 'a\nb\n');
  }));

test('fetchDbSource: rows primitivos/null viram string vazia', async () =>
  withConn(async () => {
    const conn = { execute: async () => ({ rows: [null, 42] }), close: async () => {} };
    const text = await fetchDbSource(Uri.parse('utplsql-db:/app/ut_pkg.pks') as never, async () =>
      fakeOracledb(conn),
    );
    assert.strictEqual(text, '\n');
  }));

test('fetchDbSource: falha do createPool cai para conexão raw', async () =>
  withConn(async () => {
    const conn = { execute: async () => ({ rows: [['raw']] }), close: async () => {} };
    const text = await fetchDbSource(Uri.parse('utplsql-db:/app/ut_pkg.pks') as never, async () =>
      fakeOracledb(conn, { createPoolThrows: true }),
    );
    assert.strictEqual(text, 'raw');
  }));

test('fetchDbSource: erro na query retorna vazio', async () =>
  withConn(async () => {
    const conn = {
      execute: async () => {
        throw new Error('ORA-00942');
      },
      close: async () => {},
    };
    const text = await fetchDbSource(Uri.parse('utplsql-db:/app/ut_pkg.pks') as never, async () =>
      fakeOracledb(conn),
    );
    assert.strictEqual(text, '');
  }));

test('fetchDbSource: falha ao obter conexão retorna vazio', async () =>
  withConn(async () => {
    const conn = { execute: async () => ({ rows: [] }), close: async () => {} };
    const text = await fetchDbSource(Uri.parse('utplsql-db:/app/ut_pkg.pks') as never, async () =>
      fakeOracledb(conn, { createPoolThrows: true, getConnThrows: true }),
    );
    assert.strictEqual(text, '');
  }));

test('registerDbSourceProvider: provider registrado serve e cacheia o conteúdo', async () => {
  __resetConfigValues();
  workspace.__resetTextDocumentContentProviders();
  clearDbSourceCache();
  const original = process.env.UTPLSQL_CONN;
  delete process.env.UTPLSQL_CONN;
  try {
    registerDbSourceProvider({ subscriptions: [] } as never);
    const provider = workspace.__getTextDocumentContentProvider('utplsql-db');
    assert.ok(provider, 'provider do scheme utplsql-db deveria estar registrado');

    const uri = Uri.parse('utplsql-db:/APP/UT_PKG.pks');
    const first = await provider.provideTextDocumentContent(uri);
    const second = await provider.provideTextDocumentContent(uri);
    assert.strictEqual(first, '');
    assert.strictEqual(second, '');
  } finally {
    process.env.UTPLSQL_CONN = original;
    workspace.__resetTextDocumentContentProviders();
  }
});
