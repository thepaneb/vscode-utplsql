import './setup.js';
import assert from 'node:assert';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { mock, test } from 'node:test';
import { closeOraclePool } from '../../oracleRunner';
import { __resetConfigValues } from '../vscode-stub';

// Simula a ausência do driver: import('oracledb') resolve, mas acessar
// .default lança -> loadOracledb cai no catch e retorna undefined.
// Requer --experimental-test-module-mocks (mock.module só intercepta o
// primeiro registro do specifier — por isso este arquivo isola o cenário).
const boom = new Proxy(
  {},
  {
    ownKeys: () => ['default'],
    getOwnPropertyDescriptor: () => ({
      configurable: true,
      enumerable: true,
      get() {
        throw new Error('driver oracledb ausente');
      },
    }),
  },
);
mock.module('oracledb', { namedExports: boom });

test('debugger liveRuntime: oracledb ausente retorna undefined (catch)', async () => {
  __resetConfigValues();
  const { liveRuntime } = await import('../../debugger.js');
  const conn = await liveRuntime.acquireConnection();
  assert.strictEqual(conn, undefined);
});

test('applySqlCoverage: oracledb ausente retorna cedo sem cobertura', async () => {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'vsql-nodrv-'));
  try {
    const viewsDir = path.join(base, 'install', 'views');
    fs.mkdirSync(viewsDir, { recursive: true });
    fs.writeFileSync(path.join(viewsDir, 'vw_a.sql'), 'CREATE VIEW vw_a AS\nSELECT 1\n');
    const { applySqlCoverage } = await import('../../viewCoverage.js');
    let added = false;
    const run = {
      appendOutput: () => {},
      addCoverage: () => {
        added = true;
      },
    } as never;
    const state = { setCoverage: () => {}, clearCoverage: () => {} } as never;
    const folders = [{ uri: { fsPath: base }, name: 'r', index: 0 }];
    await applySqlCoverage({
      connection: 'u/p@//h:1521/s',
      root: base,
      sourcePath: 'install',
      run,
      state,
      folders: folders as never,
    });
    assert.strictEqual(added, false);
  } finally {
    fs.rmSync(base, { recursive: true, force: true });
  }
});

test('discoverSchemaFromDb: oracledb ausente retorna vazio', async () => {
  const { discoverSchemaFromDb } = await import('../../discovery.js');
  const folder = { uri: { fsPath: '/root' }, name: 'root', index: 0 };
  const result = await discoverSchemaFromDb('u/p@//h:1521/s', 'hr', [folder as never]);
  assert.deepStrictEqual(result, []);
});

test('executeRunOracle: oracledb ausente lança oracledbMissing', async () => {
  const { executeRunOracle } = await import('../../oracleRunner.js');
  const run = {
    appendOutput: () => {},
    failed: () => {},
    passed: () => {},
    errored: () => {},
  };
  const item = { id: 't1', children: [] };
  const state = {
    getMeta: () => ({ packageName: 'pkg' }),
    setCoverage: () => {},
    clearCoverage: () => {},
  };
  const neverCancel = {
    isCancellationRequested: false,
    onCancellationRequested: () => ({ dispose: () => {} }),
  };
  await assert.rejects(
    () =>
      executeRunOracle(
        {
          connection: 'u/p@//h:1521/s',
          pathArgs: ['pkg'],
          coverage: false,
          sourcePath: 'install',
          root: '/r',
          run: run as never,
          leafTests: [item as never],
          state: state as never,
        },
        neverCancel as never,
      ),
    /oracledb/i,
  );
});

test('validateUtplsqlInstall: oracledb ausente retorna sem diagnósticos', async () => {
  const origEnv = process.env.UTPLSQL_CONN;
  process.env.UTPLSQL_CONN = 'u/p@//h:1521/s';
  try {
    const { SetupValidator } = await import('../../quickfix.js');
    const v = new SetupValidator();
    const diags = await v.validateUtplsqlInstall();
    assert.deepStrictEqual(diags, []);
  } finally {
    process.env.UTPLSQL_CONN = origEnv;
  }
});

test('recompileUt3: oracledb ausente mostra erro sem lançar', async () => {
  const origEnv = process.env.UTPLSQL_CONN;
  process.env.UTPLSQL_CONN = 'u/p@//h:1521/s';
  try {
    const { SetupValidator } = await import('../../quickfix.js');
    const v = new SetupValidator();
    await assert.doesNotReject(() => v.recompileUt3());
    await closeOraclePool();
  } finally {
    process.env.UTPLSQL_CONN = origEnv;
  }
});
