import './setup.js';
import assert from 'node:assert';
import { test } from 'node:test';
import type { UtConfig } from '../../config';
import { listReportersForConnection } from '../../oracleRunner';

const cfg = {
  oraclePoolMin: 2,
  oraclePoolMax: 10,
  oraclePoolIncrement: 1,
  oraclePoolPingInterval: 60,
  oracleClientMode: 'thin',
  oracleClientLibDir: '',
  oracleClientConfigDir: '',
  tnsAdminPath: '',
  walletLocation: '',
  walletPassword: '',
} as unknown as UtConfig;

test('listReportersForConnection: conexão inválida retorna [] (best-effort)', async () => {
  const reporters = await listReportersForConnection('formato-invalido', cfg);
  assert.deepStrictEqual(reporters, []);
});
