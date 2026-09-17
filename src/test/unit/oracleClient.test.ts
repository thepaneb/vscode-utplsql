import assert from 'node:assert';
import { beforeEach, test } from 'node:test';
import {
  ensureOracleClient,
  getOracleClientMode,
  resetOracleClientStateForTests,
} from '../../oracleClient';

type FakeInit = (options: { libDir?: string; configDir?: string }) => void;

function makeFakeOracledb(initImpl?: FakeInit) {
  const calls: { libDir?: string; configDir?: string }[] = [];
  const mod = {
    initOracleClient:
      initImpl ??
      ((options: { libDir?: string; configDir?: string }) => {
        calls.push(options);
      }),
  };
  return { mod: mod as unknown as typeof import('oracledb'), calls };
}

beforeEach(() => resetOracleClientStateForTests());

test('modo thin (default) nao inicializa thick', () => {
  const { mod, calls } = makeFakeOracledb();
  const result = ensureOracleClient(mod, 'thin', '/opt/ic', '');
  assert.strictEqual(result.thick, false);
  assert.strictEqual(calls.length, 0);
  assert.strictEqual(getOracleClientMode(), 'thin');
});

test('modo undefined (config ausente) e tratado como thin', () => {
  const { mod, calls } = makeFakeOracledb();
  const result = ensureOracleClient(mod, undefined, '/opt/ic', '');
  assert.strictEqual(result.thick, false);
  assert.strictEqual(calls.length, 0);
  assert.strictEqual(getOracleClientMode(), 'thin');
});

test('modo thick com libDir inicializa uma unica vez', () => {
  const { mod, calls } = makeFakeOracledb();
  const result = ensureOracleClient(mod, 'thick', '/opt/ic', '/opt/ic/network/admin');
  assert.strictEqual(result.thick, true);
  assert.deepStrictEqual(calls, [{ libDir: '/opt/ic', configDir: '/opt/ic/network/admin' }]);
  assert.strictEqual(getOracleClientMode(), 'thick');
});

test('configDir vazio nao e repassado', () => {
  const { mod, calls } = makeFakeOracledb();
  ensureOracleClient(mod, 'thick', '/opt/ic', '   ');
  assert.deepStrictEqual(calls, [{ libDir: '/opt/ic' }]);
});

test('segunda chamada nao re-inicializa (idempotencia)', () => {
  const { mod, calls } = makeFakeOracledb();
  ensureOracleClient(mod, 'thick', '/opt/ic', '');
  ensureOracleClient(mod, 'thick', '/opt/ic', '');
  assert.strictEqual(calls.length, 1);
});

test('modo fixado na primeira chamada: thin nao vira thick depois', () => {
  const { mod, calls } = makeFakeOracledb();
  ensureOracleClient(mod, 'thin', '', '');
  const result = ensureOracleClient(mod, 'thick', '/opt/ic', '');
  assert.strictEqual(result.thick, false);
  assert.strictEqual(calls.length, 0);
  assert.strictEqual(getOracleClientMode(), 'thin');
});

test('thick sem libDir devolve erro amigavel e nao inicializa', () => {
  const { mod, calls } = makeFakeOracledb();
  const result = ensureOracleClient(mod, 'thick', '  ', '');
  assert.strictEqual(result.thick, false);
  assert.match(String(result.error), /oracleClientLibDir/);
  assert.strictEqual(calls.length, 0);
  assert.strictEqual(getOracleClientMode(), 'unknown');
});

test('NJS-090 (ja inicializado com outros argumentos) e tratado como thick', () => {
  const { mod, calls } = makeFakeOracledb(() => {
    throw new Error('NJS-090: initOracleClient() was already called with different arguments');
  });
  const result = ensureOracleClient(mod, 'thick', '/opt/ic', '');
  assert.strictEqual(result.thick, true);
  assert.strictEqual(result.error, undefined);
  assert.strictEqual(getOracleClientMode(), 'thick');
  assert.strictEqual(calls.length, 0);
});

test('falha DPI-1047 devolve erro sem lancar', () => {
  const { mod } = makeFakeOracledb(() => {
    throw new Error('DPI-1047: Cannot locate a 64-bit Oracle Client library');
  });
  const result = ensureOracleClient(mod, 'thick', '/caminho/invalido', '');
  assert.strictEqual(result.thick, false);
  assert.match(String(result.error), /DPI-1047/);
  assert.strictEqual(getOracleClientMode(), 'unknown');
  const again = ensureOracleClient(mod, 'thick', '/caminho/invalido', '');
  assert.strictEqual(again.thick, false);
  assert.match(String(again.error), /DPI-1047/);
});

test('initOracleClient ausente na build devolve erro', () => {
  const mod = {} as unknown as typeof import('oracledb');
  const result = ensureOracleClient(mod, 'thick', '/opt/ic', '');
  assert.strictEqual(result.thick, false);
  assert.match(String(result.error), /initOracleClient/);
});

test('resetOracleClientStateForTests volta ao estado inicial', () => {
  const { mod } = makeFakeOracledb();
  ensureOracleClient(mod, 'thick', '/opt/ic', '');
  resetOracleClientStateForTests();
  assert.strictEqual(getOracleClientMode(), 'unknown');
});
