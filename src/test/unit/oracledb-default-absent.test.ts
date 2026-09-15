import './setup.js';
import assert from 'node:assert';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { mock, test } from 'node:test';
import { closeOraclePool } from '../../oracleRunner';
import { __resetConfigValues } from '../vscode-stub';

// Simula um módulo ESM/CJS sem export default: mod.default undefined ->
// loadOracledb cai no `?? mod` e usa o namespace como driver.
mock.module('oracledb', { namedExports: {}, defaultExport: undefined });

test('debugger liveRuntime: oracledb sem default usa o namespace (?? mod)', async () => {
  __resetConfigValues();
  const { liveRuntime } = await import('../../debugger.js');
  const conn = await liveRuntime.acquireConnection();
  assert.strictEqual(conn, undefined);
});

test('applySqlCoverage: oracledb sem default degrada sem cobertura', async () => {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'vsql-nodef-'));
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

test('executeRunOracle: oracledb sem default rejeita (pool indisponível)', async () => {
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
  await assert.rejects(() =>
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
  );
  await closeOraclePool();
});

test('validateUtplsqlInstall: oracledb sem default degrada sem diagnósticos', async () => {
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
