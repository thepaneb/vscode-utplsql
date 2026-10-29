import './setup.js';
import assert from 'node:assert';
import { afterEach, beforeEach, test } from 'node:test';
import * as vscode from 'vscode';
import { readConfig } from '../../config';
import { discoverDbSuites, discoverSchemaFromDb } from '../../discovery';
import { setLogSink } from '../../logger';
import { resetOracleClientStateForTests } from '../../oracleClient';
import { closeOraclePool, findInvalidUt3Objects, withOracleConnection } from '../../oracleRunner';

const CONN = 'scott/tiger@//host:1521/svc';
const MASKED = 'scott@//host:1521/svc';

type Log = { level: string; msg: string; ctx?: Record<string, unknown> };
let logs: Log[] = [];

beforeEach(async () => {
  logs = [];
  resetOracleClientStateForTests();
  await closeOraclePool();
  setLogSink((level, msg, ctx) => logs.push({ level, msg, ctx }));
});

afterEach(() => setLogSink(undefined));

/** Driver que falha nas duas formas de aquisição, ecoando a connection crua. */
function failingOracleDb(): typeof import('oracledb') {
  return {
    outFormat: 4002,
    OUT_FORMAT_OBJECT: 4002,
    createPool: async () => {
      throw new Error(`createPool falhou para ${CONN}`);
    },
    getConnection: async () => {
      throw new Error(`getConnection falhou para ${CONN}`);
    },
  } as unknown as typeof import('oracledb');
}

function assertRedacted(): void {
  const text = JSON.stringify(logs);
  assert.ok(text.length > 0, 'deveria ter logado o erro');
  assert.ok(text.includes(MASKED), `esperava a conexão mascarada; veio: ${text}`);
  assert.ok(!text.includes('tiger'), `a senha vazou no log: ${text}`);
}

test('withOracleConnection: redige a connection no log de falha', async () => {
  const result = await withOracleConnection(
    failingOracleDb(),
    CONN,
    readConfig(),
    async () => 'ok',
  );
  assert.strictEqual(result, undefined);
  assertRedacted();
});

test('findInvalidUt3Objects: redige a connection no log de falha', async () => {
  const result = await findInvalidUt3Objects(failingOracleDb(), CONN, readConfig());
  assert.strictEqual(result, undefined);
  assertRedacted();
});

test('discoverDbSuites: redige a connection no log de falha', async () => {
  const folder = { uri: vscode.Uri.file('/tmp/ws'), name: 'ws', index: 0 };
  const result = await discoverDbSuites(CONN, 'HR', [folder], async () => failingOracleDb());
  assert.deepStrictEqual(result, []);
  assertRedacted();
});

test('discoverSchemaFromDb: redige a connection no log de falha', async () => {
  const folder = { uri: vscode.Uri.file('/tmp/ws'), name: 'ws', index: 0 };
  const result = await discoverSchemaFromDb(CONN, 'HR', [folder], async () => failingOracleDb());
  assert.deepStrictEqual(result, []);
  assertRedacted();
});
