import './setup.js';
import assert from 'node:assert';
import { mock, test } from 'node:test';
import { TestStateManager } from '../../state';
import { __getLastDiagnosticCollection, __resetConfigValues } from '../vscode-stub';

// O import dinâmico do driver fica em outro spec: mock.module só intercepta o
// primeiro registro do specifier e não deve contaminar os demais testes.
const missingDriver = {
  get default(): never {
    throw new Error('oracledb ausente');
  },
};
mock.module('oracledb', { namedExports: missingDriver });

test('refresh: driver oracledb ausente é tratado como best-effort', async () => {
  __resetConfigValues();
  const originalConnection = process.env.UTPLSQL_CONN;
  process.env.UTPLSQL_CONN = 'u/p@//h:1521/s';
  try {
    const { registerCompilationDiagnostics, refreshCompilationDiagnostics } = await import(
      '../../compilationDiagnostics.js'
    );
    registerCompilationDiagnostics({ subscriptions: [] } as never);
    await assert.doesNotReject(() => refreshCompilationDiagnostics(new TestStateManager()));
    assert.strictEqual(
      __getLastDiagnosticCollection()?.get({ toString: () => '/tmp/test_pkg.pks' }),
      undefined,
    );
  } finally {
    if (originalConnection === undefined) delete process.env.UTPLSQL_CONN;
    else process.env.UTPLSQL_CONN = originalConnection;
    __resetConfigValues();
  }
});
