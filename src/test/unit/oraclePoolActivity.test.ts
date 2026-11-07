import './setup.js';
import assert from 'node:assert';
import { beforeEach, test } from 'node:test';
import { readConfig } from '../../config';
import {
  beginOracleActivity,
  closeIdleOraclePool,
  closeOraclePool,
  ensurePool,
} from '../../oracleRunner';
import { __resetConfigValues, __setConfigValue } from '../vscode-stub';

interface FakePool {
  connectionsInUse: number;
  closed: number[];
  closeThrows?: boolean;
  close(drainTime: number): Promise<void>;
}

interface FakeDb {
  createPool(attrs: unknown): Promise<FakePool>;
  created: unknown[];
}

function makeFakeDb(): { db: FakeDb; pool: FakePool } {
  const pool: FakePool = {
    connectionsInUse: 0,
    closed: [],
    async close(drainTime: number) {
      pool.closed.push(drainTime);
      if (pool.closeThrows) throw new Error('close failed');
    },
  };
  const db: FakeDb = {
    created: [],
    async createPool(attrs: unknown) {
      db.created.push(attrs);
      return pool;
    },
  };
  return { db, pool };
}

const CONN = 'u/p@//localhost:1521/svc';

beforeEach(async () => {
  __resetConfigValues();
  await closeOraclePool();
});

test('PRD-101: fecha o pool quando a última atividade termina', async () => {
  __setConfigValue('oraclePoolCloseAfterRun', true);
  const { db, pool } = makeFakeDb();
  const cfg = readConfig();
  await ensurePool(db as never, CONN, cfg);

  const activity = beginOracleActivity(cfg);
  await activity.end();

  assert.deepStrictEqual(pool.closed, [0]);
});

test('PRD-101: não fecha pool com conexão em uso', async () => {
  __setConfigValue('oraclePoolCloseAfterRun', true);
  const { db, pool } = makeFakeDb();
  const cfg = readConfig();
  await ensurePool(db as never, CONN, cfg);
  pool.connectionsInUse = 1;

  const activity = beginOracleActivity(cfg);
  await activity.end();

  assert.deepStrictEqual(pool.closed, []);
});

test('PRD-101: ref-count mantém o pool até a última atividade', async () => {
  __setConfigValue('oraclePoolCloseAfterRun', true);
  const { db, pool } = makeFakeDb();
  const cfg = readConfig();
  await ensurePool(db as never, CONN, cfg);

  const first = beginOracleActivity(cfg);
  const second = beginOracleActivity(cfg);
  await first.end();
  assert.deepStrictEqual(pool.closed, []);
  await second.end();
  assert.deepStrictEqual(pool.closed, [0]);
});

test('PRD-101: end duplicado conta uma vez', async () => {
  __setConfigValue('oraclePoolCloseAfterRun', true);
  const { db, pool } = makeFakeDb();
  const cfg = readConfig();
  await ensurePool(db as never, CONN, cfg);

  const activity = beginOracleActivity(cfg);
  await activity.end();
  await activity.end();

  assert.deepStrictEqual(pool.closed, [0]);
});

test('PRD-101: falha ao fechar não lança e não derruba a operação', async () => {
  __setConfigValue('oraclePoolCloseAfterRun', true);
  const { db, pool } = makeFakeDb();
  const cfg = readConfig();
  await ensurePool(db as never, CONN, cfg);
  pool.closeThrows = true;

  const activity = beginOracleActivity(cfg);
  await assert.doesNotReject(() => activity.end());
  assert.deepStrictEqual(pool.closed, [0]);
});

test('PRD-101: setting desligado preserva o pool', async () => {
  __setConfigValue('oraclePoolCloseAfterRun', false);
  const { db, pool } = makeFakeDb();
  const cfg = readConfig();
  await ensurePool(db as never, CONN, cfg);

  const activity = beginOracleActivity(cfg);
  await activity.end();

  assert.deepStrictEqual(pool.closed, []);
});

test('PRD-101: remove do cache antes do close (novo ensurePool recria)', async () => {
  __setConfigValue('oraclePoolCloseAfterRun', true);
  const { db, pool } = makeFakeDb();
  const cfg = readConfig();
  await ensurePool(db as never, CONN, cfg);

  await closeIdleOraclePool(cfg);
  assert.deepStrictEqual(pool.closed, [0]);

  await ensurePool(db as never, CONN, cfg);
  assert.strictEqual(db.created.length, 2);
});
