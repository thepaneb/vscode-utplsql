import './setup.js';
import assert from 'node:assert';
import { mock, test } from 'node:test';
import { __resetConfigValues } from '../vscode-stub';

// Cobre o caminho de conexão de `validateOnActivation` (versão do utPLSQL)
// com o driver mockado — isolado em arquivo próprio porque `mock.module` só
// intercepta o primeiro registro do specifier.

let utVersion = '3.2.3';
const dbVersion = '19.0.0.0.0';
let failConnect = false;

const conn = {
  callTimeout: 0,
  execute: async (sql: string) => {
    if (/ut_runner\.version/i.test(sql)) return { rows: [[utVersion]] };
    if (/product_component_version/i.test(sql)) return { rows: [[dbVersion]] };
    return { rows: [] };
  },
  close: async () => {},
};

const fakeOracledb = {
  OUT_FORMAT_OBJECT: {},
  outFormat: undefined,
  createPool: async () => {
    if (failConnect) throw new Error('pool down');
    return { getConnection: async () => conn, close: async () => {} };
  },
  getConnection: async () => {
    if (failConnect) throw new Error('db down');
    return conn;
  },
};
mock.module('oracledb', { namedExports: fakeOracledb });

async function withConn(fn: () => Promise<void>): Promise<void> {
  const orig = process.env.UTPLSQL_CONN;
  process.env.UTPLSQL_CONN = 'u/p@//h:1521/s';
  const { closeOraclePool } = await import('../../oracleRunner.js');
  try {
    await fn();
  } finally {
    process.env.UTPLSQL_CONN = orig;
    await closeOraclePool();
  }
}

test('validateOnActivation: versão antiga do utPLSQL gera UTPLSQL_OLD_VERSION', async () =>
  withConn(async () => {
    __resetConfigValues();
    utVersion = '3.0.0';
    const { SetupValidator } = await import('../../quickfix.js');
    const diags = await new SetupValidator().validateOnActivation();
    assert.deepStrictEqual(
      diags.map((d) => d.code),
      ['UTPLSQL_OLD_VERSION'],
    );
  }));

test('validateOnActivation: versão atual não gera diagnósticos', async () =>
  withConn(async () => {
    __resetConfigValues();
    utVersion = '3.2.3';
    const { SetupValidator } = await import('../../quickfix.js');
    const diags = await new SetupValidator().validateOnActivation();
    assert.deepStrictEqual(diags, []);
  }));

test('validateOnActivation: falha de conexão gera UTPLSQL_BAD_CONN', async () =>
  withConn(async () => {
    __resetConfigValues();
    utVersion = '3.2.3';
    failConnect = true;
    try {
      const { SetupValidator } = await import('../../quickfix.js');
      const diags = await new SetupValidator().validateOnActivation();
      assert.deepStrictEqual(
        diags.map((d) => d.code),
        ['UTPLSQL_BAD_CONN'],
      );
    } finally {
      failConnect = false;
    }
  }));
