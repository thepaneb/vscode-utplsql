import './setup.js';
import assert from 'node:assert';
import { test } from 'node:test';
import {
  type CompileTarget,
  compileForDebug,
  compileForDebugSql,
  compileTargetsForDebug,
  debuggableFromFile,
} from '../../compileForDebug';
import { __resetConfigValues } from '../vscode-stub';

test('debuggableFromFile: mapeia extensões de objeto', () => {
  assert.deepStrictEqual(debuggableFromFile('/a/b/test_hello.pks'), {
    name: 'test_hello',
    kinds: ['package'],
  });
  assert.deepStrictEqual(debuggableFromFile('C:\\x\\UT_F.PKB'), {
    name: 'UT_F',
    kinds: ['package'],
  });
  assert.deepStrictEqual(debuggableFromFile('x.fnc'), { name: 'x', kinds: ['function'] });
  assert.deepStrictEqual(debuggableFromFile('x.prc'), { name: 'x', kinds: ['procedure'] });
  assert.deepStrictEqual(debuggableFromFile('x.trg'), { name: 'x', kinds: ['trigger'] });
});

test('debuggableFromFile: .sql é ambíguo e devolve todos os tipos', () => {
  assert.deepStrictEqual(debuggableFromFile('x.sql'), {
    name: 'x',
    kinds: ['package', 'procedure', 'function', 'trigger'],
  });
});

test('debuggableFromFile: rejeita sem nome ou extensão desconhecida', () => {
  assert.strictEqual(debuggableFromFile('noext'), undefined);
  assert.strictEqual(debuggableFromFile('.pks'), undefined);
  assert.strictEqual(debuggableFromFile('/a/b/readme.md'), undefined);
});

test('compileForDebugSql: upper case e aspas', () => {
  assert.strictEqual(
    compileForDebugSql('package', 'app', 'test_hello'),
    'ALTER PACKAGE "APP"."TEST_HELLO" COMPILE DEBUG PLSQL_OPTIMIZE_LEVEL = 1',
  );
});

test('compileTargetsForDebug: compila com o owner default', async () => {
  const calls: string[] = [];
  const conn = { execute: async (sql: string) => void calls.push(sql) };
  const result = await compileTargetsForDebug(conn, [{ name: 'p', kinds: ['package'] }], 'app');
  assert.deepStrictEqual(calls, ['ALTER PACKAGE "APP"."P" COMPILE DEBUG PLSQL_OPTIMIZE_LEVEL = 1']);
  assert.deepStrictEqual(result.ok, ['package APP.P']);
  assert.deepStrictEqual(result.failed, []);
});

test('compileTargetsForDebug: owner do alvo tem prioridade', async () => {
  const calls: string[] = [];
  const conn = { execute: async (sql: string) => void calls.push(sql) };
  await compileTargetsForDebug(conn, [{ name: 'p', kinds: ['package'], owner: 'other' }], 'app');
  assert.deepStrictEqual(calls, [
    'ALTER PACKAGE "OTHER"."P" COMPILE DEBUG PLSQL_OPTIMIZE_LEVEL = 1',
  ]);
});

test('compileTargetsForDebug: .sql faz fallback enquanto o objeto não existe', async () => {
  const calls: string[] = [];
  const conn = {
    execute: async (sql: string) => {
      calls.push(sql);
      if (sql.startsWith('ALTER PACKAGE') || sql.startsWith('ALTER PROCEDURE')) {
        throw Object.assign(new Error('ORA-04043: object P does not exist'), { errorNum: 4043 });
      }
    },
  };
  const kinds: CompileTarget['kinds'] = ['package', 'procedure', 'function', 'trigger'];
  const result = await compileTargetsForDebug(conn, [{ name: 'p', kinds }], 'app');
  assert.strictEqual(calls.length, 3);
  assert.deepStrictEqual(result.ok, ['function APP.P']);
  assert.deepStrictEqual(result.failed, []);
});

test('compileTargetsForDebug: erro que não é ORA-04043 aborta o alvo', async () => {
  const calls: string[] = [];
  const conn = {
    execute: async (sql: string) => {
      calls.push(sql);
      throw Object.assign(new Error('ORA-00942: table or view does not exist'), { errorNum: 942 });
    },
  };
  const kinds: CompileTarget['kinds'] = ['package', 'procedure'];
  const result = await compileTargetsForDebug(conn, [{ name: 'p', kinds }], 'app');
  assert.strictEqual(calls.length, 1);
  assert.deepStrictEqual(result.ok, []);
  assert.strictEqual(result.failed.length, 1);
  assert.match(result.failed[0].error, /ORA-00942/);
});

test('compileTargetsForDebug: ORA-04043 em todos os tipos vira falha', async () => {
  const conn = {
    execute: async () => {
      throw Object.assign(new Error('ORA-04043: object P does not exist'), { errorNum: 4043 });
    },
  };
  const kinds: CompileTarget['kinds'] = ['package', 'procedure', 'function', 'trigger'];
  const result = await compileTargetsForDebug(conn, [{ name: 'p', kinds }], 'app');
  assert.deepStrictEqual(result.ok, []);
  assert.strictEqual(result.failed.length, 1);
});

test('compileForDebug: lista vazia retorna cedo sem tocar o Oracle', async () => {
  const result = await compileForDebug([]);
  assert.deepStrictEqual(result, { ok: [], failed: [] });
});

test('compileForDebug: sem conexão retorna falha amigável', async () => {
  const origEnv = process.env.UTPLSQL_CONN;
  delete process.env.UTPLSQL_CONN;
  __resetConfigValues();
  try {
    const result = await compileForDebug([{ name: 'x', kinds: ['package'] }]);
    assert.deepStrictEqual(result.ok, []);
    assert.strictEqual(result.failed.length, 1);
    assert.strictEqual(result.failed[0].name, '*');
  } finally {
    process.env.UTPLSQL_CONN = origEnv;
    __resetConfigValues();
  }
});
