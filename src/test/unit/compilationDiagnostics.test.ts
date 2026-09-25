import './setup.js';
import assert from 'node:assert';
import { mock, test } from 'node:test';
import { TestStateManager } from '../../state';
import {
  __getLastDiagnosticCollection,
  __resetConfigValues,
  __setConfigValue,
  Uri,
} from '../vscode-stub';

// Cobre `compilationDiagnostics.ts` com oracleRunner mockado (sem banco):
// o mapeamento ALL_ERRORS → Uri da suite e as guardas de setting/conexão.

let errors: Array<{
  name: string;
  type: string;
  line?: number;
  position: number;
  text: string;
}> = [];
let throwInWithConnection = false;

mock.module('../../oracleRunner.js', {
  namedExports: {
    connectionUser: (conn: string) => (conn.includes('/') ? conn.split('/')[0].toUpperCase() : ''),
    checkCompilationErrors: async () => errors,
    withOracleConnection: async (
      _db: unknown,
      _conn: string,
      _cfg: unknown,
      fn: (conn: unknown) => Promise<void>,
    ) => {
      if (throwInWithConnection) throw new Error('conexão caiu');
      await fn({ execute: async () => ({ rows: [] }) });
    },
  },
});

function makeState() {
  const state = new TestStateManager();
  const item = { id: 'suite:test_pkg', children: [] } as never;
  state.setMeta(item, {
    kind: 'suite',
    packageName: 'TEST_PKG',
    uri: Uri.file('/tmp/test_pkg.pks'),
  } as never);
  state.cachedItems.push(item);
  return state;
}

async function withConn(fn: () => Promise<void>): Promise<void> {
  const orig = process.env.UTPLSQL_CONN;
  process.env.UTPLSQL_CONN = 'u/p@//h:1521/s';
  try {
    await fn();
  } finally {
    if (orig === undefined) delete process.env.UTPLSQL_CONN;
    else process.env.UTPLSQL_CONN = orig;
    __resetConfigValues();
  }
}

test('refresh: sem collection registrada retorna cedo', async () => {
  const { refreshCompilationDiagnostics } = await import('../../compilationDiagnostics.js');
  await assert.doesNotReject(() => refreshCompilationDiagnostics(makeState()));
});

test('refresh: publica erro de compilação no Uri da suite', async () => {
  await withConn(async () => {
    const { registerCompilationDiagnostics, refreshCompilationDiagnostics } = await import(
      '../../compilationDiagnostics.js'
    );
    registerCompilationDiagnostics({ subscriptions: [] } as never);
    errors = [{ name: 'TEST_PKG', type: 'PLS-00103', line: 5, position: 3, text: 'boom' }];
    const state = makeState();
    await refreshCompilationDiagnostics(state);

    const diags = __getLastDiagnosticCollection()?.get({ toString: () => '/tmp/test_pkg.pks' });
    assert.strictEqual(diags?.length, 1);
    assert.strictEqual(diags?.[0].source, 'utPLSQL Compilation');
    assert.strictEqual(diags?.[0].message, 'PLS-00103: boom');
  });
});

test('refresh: setting desabilitada não publica nada', async () => {
  await withConn(async () => {
    const { registerCompilationDiagnostics, refreshCompilationDiagnostics } = await import(
      '../../compilationDiagnostics.js'
    );
    registerCompilationDiagnostics({ subscriptions: [] } as never);
    __setConfigValue('compilationDiagnostics.enabled', false);
    errors = [{ name: 'TEST_PKG', type: 'PLS-00103', line: 1, position: 0, text: 'x' }];
    await refreshCompilationDiagnostics(makeState());
    assert.strictEqual(
      __getLastDiagnosticCollection()?.get({ toString: () => '/tmp/test_pkg.pks' }),
      undefined,
    );
  });
});

test('refresh: sem conexão não publica nada', async () => {
  const { registerCompilationDiagnostics, refreshCompilationDiagnostics } = await import(
    '../../compilationDiagnostics.js'
  );
  registerCompilationDiagnostics({ subscriptions: [] } as never);
  const orig = process.env.UTPLSQL_CONN;
  delete process.env.UTPLSQL_CONN;
  errors = [{ name: 'TEST_PKG', type: 'PLS-00103', line: 1, position: 0, text: 'x' }];
  try {
    await refreshCompilationDiagnostics(makeState());
    assert.strictEqual(
      __getLastDiagnosticCollection()?.get({ toString: () => '/tmp/test_pkg.pks' }),
      undefined,
    );
  } finally {
    if (orig !== undefined) process.env.UTPLSQL_CONN = orig;
    __resetConfigValues();
  }
});

test('refresh: erro de objeto sem suite descoberta é ignorado', async () => {
  await withConn(async () => {
    const { registerCompilationDiagnostics, refreshCompilationDiagnostics } = await import(
      '../../compilationDiagnostics.js'
    );
    registerCompilationDiagnostics({ subscriptions: [] } as never);
    errors = [{ name: 'OUTRO_PKG', type: 'PLS-00103', line: 1, position: 0, text: 'x' }];
    await refreshCompilationDiagnostics(makeState());
    assert.strictEqual(
      __getLastDiagnosticCollection()?.get({ toString: () => '/tmp/test_pkg.pks' }),
      undefined,
    );
  });
});

test('refresh: falha de conexão é engolida (best-effort)', async () => {
  await withConn(async () => {
    const { registerCompilationDiagnostics, refreshCompilationDiagnostics } = await import(
      '../../compilationDiagnostics.js'
    );
    registerCompilationDiagnostics({ subscriptions: [] } as never);
    throwInWithConnection = true;
    try {
      await assert.doesNotReject(() => refreshCompilationDiagnostics(makeState()));
    } finally {
      throwInWithConnection = false;
    }
  });
});

test('clearCompilationDiagnostics: limpa a collection', async () => {
  await withConn(async () => {
    const {
      clearCompilationDiagnostics,
      registerCompilationDiagnostics,
      refreshCompilationDiagnostics,
    } = await import('../../compilationDiagnostics.js');
    registerCompilationDiagnostics({ subscriptions: [] } as never);
    errors = [{ name: 'TEST_PKG', type: 'PLS-00103', line: 2, position: 0, text: 'y' }];
    await refreshCompilationDiagnostics(makeState());
    assert.ok(__getLastDiagnosticCollection()?.get({ toString: () => '/tmp/test_pkg.pks' }));
    clearCompilationDiagnostics();
    assert.strictEqual(
      __getLastDiagnosticCollection()?.get({ toString: () => '/tmp/test_pkg.pks' }),
      undefined,
    );
  });
});

test('refresh: lista vazia limpa diagnósticos anteriores', async () => {
  await withConn(async () => {
    const { registerCompilationDiagnostics, refreshCompilationDiagnostics } = await import(
      '../../compilationDiagnostics.js'
    );
    registerCompilationDiagnostics({ subscriptions: [] } as never);
    errors = [{ name: 'TEST_PKG', type: 'PLS-00103', line: 2, position: 0, text: 'antes' }];
    await refreshCompilationDiagnostics(makeState());
    assert.ok(__getLastDiagnosticCollection()?.get({ toString: () => '/tmp/test_pkg.pks' }));

    errors = [];
    await refreshCompilationDiagnostics(makeState());
    assert.strictEqual(
      __getLastDiagnosticCollection()?.get({ toString: () => '/tmp/test_pkg.pks' }),
      undefined,
    );
  });
});

test('refresh: conexão com schema inválido não publica diagnóstico', async () => {
  await withConn(async () => {
    const { registerCompilationDiagnostics, refreshCompilationDiagnostics } = await import(
      '../../compilationDiagnostics.js'
    );
    registerCompilationDiagnostics({ subscriptions: [] } as never);
    process.env.UTPLSQL_CONN = 'formato-invalido';
    errors = [{ name: 'TEST_PKG', type: 'PLS-00103', line: 1, position: 0, text: 'x' }];
    await refreshCompilationDiagnostics(makeState());
    assert.strictEqual(
      __getLastDiagnosticCollection()?.get({ toString: () => '/tmp/test_pkg.pks' }),
      undefined,
    );
  });
});

test('refresh: publica vários errors e normaliza line 0/ausente para zero', async () => {
  await withConn(async () => {
    const { registerCompilationDiagnostics, refreshCompilationDiagnostics } = await import(
      '../../compilationDiagnostics.js'
    );
    registerCompilationDiagnostics({ subscriptions: [] } as never);
    errors = [
      { name: 'test_pkg', type: 'PLS-00103', line: 0, position: 0, text: 'zero' },
      {
        name: 'TEST_PKG',
        type: 'PLS-00104',
        line: undefined,
        position: 0,
        text: 'ausente',
      },
    ];
    await refreshCompilationDiagnostics(makeState());
    const diags = __getLastDiagnosticCollection()?.get({ toString: () => '/tmp/test_pkg.pks' });
    assert.strictEqual(diags?.length, 2);
    assert.deepStrictEqual(
      diags?.map((d) => d.range.startLine),
      [0, 0],
    );
    assert.deepStrictEqual(
      diags?.map((d) => d.message),
      ['PLS-00103: zero', 'PLS-00104: ausente'],
    );
  });
});

test('refresh: metadata de suite sem URI é ignorada', async () => {
  await withConn(async () => {
    const { registerCompilationDiagnostics, refreshCompilationDiagnostics } = await import(
      '../../compilationDiagnostics.js'
    );
    registerCompilationDiagnostics({ subscriptions: [] } as never);
    const state = new TestStateManager();
    const item = { id: 'suite:no_uri', children: [] } as never;
    state.setMeta(item, { kind: 'suite', packageName: 'NO_URI' } as never);
    state.cachedItems.push(item);
    errors = [{ name: 'NO_URI', type: 'PLS-00103', line: 1, position: 0, text: 'x' }];
    await refreshCompilationDiagnostics(state);
    assert.strictEqual(
      __getLastDiagnosticCollection()?.get({ toString: () => '/tmp/test_pkg.pks' }),
      undefined,
    );
  });
});
