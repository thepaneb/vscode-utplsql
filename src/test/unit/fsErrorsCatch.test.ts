import './setup.js';
import assert from 'node:assert';
import * as path from 'node:path';
import { mock, test } from 'node:test';

// Cobre os `catch` defensivos de leitura/estat de arquivo em `coverage.ts` e
// `viewCoverage.ts`. Isolado porque mocka `node:fs` (só o primeiro registro
// do specifier vale).

mock.module('node:fs', {
  namedExports: {
    existsSync: () => true,
    statSync: (p: unknown) => {
      if (String(p).includes('lança')) throw new Error('EACCES stat');
      return { isDirectory: () => false, isFile: () => true };
    },
    readdirSync: () => ['lança.sql', 'vw_a.sql'],
    readFileSync: () => {
      throw new Error('EACCES read');
    },
  },
});

test('resolveSourceUri: statSync que lança cai no catch e segue', async () => {
  const { resolveSourceUri } = await import('../../coverage.js');
  assert.strictEqual(resolveSourceUri('lança.sql', '/ws', 'install'), undefined);
});

test('discoverViewFiles: statSync que lança é ignorado (ramo continue)', async () => {
  const { discoverViewFiles } = await import('../../viewCoverage.js');
  assert.deepStrictEqual(discoverViewFiles('/root', 'install'), [
    path.join('/root', 'install', 'views', 'vw_a.sql'),
  ]);
});

test('applySqlCoverage: readLines que falha é ignorado (sem cobertura)', async () => {
  const { applySqlCoverage } = await import('../../viewCoverage.js');
  const conn = { callTimeout: 0, execute: async () => ({ rows: [] }), close: async () => {} };
  const mod = {
    OUT_FORMAT_OBJECT: {},
    createPool: async () => ({ getConnection: async () => conn, close: async () => {} }),
  };
  const run = { appendOutput: () => {}, addCoverage: () => {} };
  const state = { setCoverage: () => {}, clearCoverage: () => {} };
  await assert.doesNotReject(() =>
    applySqlCoverage(
      {
        connection: 'u/p@//h:1521/s',
        root: '/root',
        sourcePath: 'install',
        run: run as never,
        state: state as never,
      },
      async () => mod as never,
    ),
  );
});
