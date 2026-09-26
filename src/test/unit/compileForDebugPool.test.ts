import './setup.js';
import assert from 'node:assert';
import { mock, test } from 'node:test';
import { __resetConfigValues } from '../vscode-stub';

// Cobre os caminhos de conexão de `compileForDebug` (pool vs getConnection cru)
// com o driver mockado — isolado porque `mock.module` só intercepta um registro.

let createPoolThrows = false;
let getConnectionThrows = false;
const executed: string[] = [];

const conn = {
  execute: async (sql: string) => {
    executed.push(sql);
    return {};
  },
  close: async () => {},
};
const pool = { getConnection: async () => conn, close: async () => {} };

mock.module('oracledb', {
  namedExports: {
    OUT_FORMAT_OBJECT: {},
    createPool: async () => {
      if (createPoolThrows) throw new Error('pool down');
      return pool;
    },
    getConnection: async () => {
      if (getConnectionThrows) throw new Error('conn down');
      return conn;
    },
  },
});

async function withConn(fn: () => Promise<void>): Promise<void> {
  const orig = process.env.UTPLSQL_CONN;
  process.env.UTPLSQL_CONN = 'u/p@//h:1521/s';
  const { closeOraclePool } = await import('../../oracleRunner.js');
  try {
    createPoolThrows = false;
    getConnectionThrows = false;
    executed.length = 0;
    __resetConfigValues();
    await fn();
  } finally {
    if (orig === undefined) delete process.env.UTPLSQL_CONN;
    else process.env.UTPLSQL_CONN = orig;
    __resetConfigValues();
    await closeOraclePool();
  }
}

test('compileForDebug: usa o pool quando disponível', async () => {
  await withConn(async () => {
    const { compileForDebug } = await import('../../compileForDebug.js');
    const result = await compileForDebug([{ name: 'p', kinds: ['package'] }]);
    assert.deepStrictEqual(result.ok, ['package U.P']);
    assert.strictEqual(executed.length, 1);
  });
});

test('compileForDebug: cai para a conexão crua quando o pool falha', async () => {
  await withConn(async () => {
    createPoolThrows = true;
    const { compileForDebug } = await import('../../compileForDebug.js');
    const result = await compileForDebug([{ name: 'p', kinds: ['package'] }]);
    assert.deepStrictEqual(result.ok, ['package U.P']);
  });
});

test('compileForDebug: falha ao obter conexão vira erro amigável', async () => {
  await withConn(async () => {
    createPoolThrows = true;
    getConnectionThrows = true;
    const { compileForDebug } = await import('../../compileForDebug.js');
    const result = await compileForDebug([{ name: 'p', kinds: ['package'] }]);
    assert.deepStrictEqual(result.ok, []);
    assert.strictEqual(result.failed[0].name, '*');
    assert.match(result.failed[0].error, /conn down/);
  });
});
