import './setup.js';
import assert from 'node:assert';
import { test } from 'node:test';
import { closeOraclePool } from '../../oracleRunner';
import { SetupValidator } from '../../quickfix';
import { __resetConfigValues, __setConfigValue } from '../vscode-stub';

const CONN = 'user/pass@//host:1521/svc';

interface FakeOracledbOptions {
  rows?: unknown[];
  throwOnConnect?: boolean;
  throwOnExecute?: boolean;
}

function makeFakeOracledb(opts: FakeOracledbOptions = {}) {
  const conn = {
    callTimeout: 0,
    execute: async (sql: string) => {
      if (opts.throwOnExecute) throw new Error('ORA-00942');
      if (sql.includes('ALL_SYNONYMS')) return { rows: [] };
      return { rows: opts.rows ?? [] };
    },
    close: async () => {},
    break: async () => {},
  };
  const fail = () => Promise.reject(new Error('connect fail'));
  return {
    getConnection: opts.throwOnConnect ? fail : async () => conn,
    createPool: opts.throwOnConnect
      ? fail
      : async () => ({ getConnection: async () => conn, close: async () => {} }),
  };
}

async function withConnEnv(fn: () => Promise<void>): Promise<void> {
  const origEnv = process.env.UTPLSQL_CONN;
  process.env.UTPLSQL_CONN = CONN;
  try {
    await fn();
  } finally {
    process.env.UTPLSQL_CONN = origEnv;
    await closeOraclePool();
  }
}

test('validateUtplsqlInstall: objetos invalidos geram diagnostic', async () =>
  withConnEnv(async () => {
    __resetConfigValues();
    const v = new SetupValidator();
    const fake = makeFakeOracledb({
      rows: [
        ['PKG_A', 'PACKAGE BODY'],
        ['UT3_T', 'TYPE'],
      ],
    });
    const diags = await v.validateUtplsqlInstall(fake as any);
    assert.strictEqual(diags.length, 1);
    assert.strictEqual(diags[0].code, 'UTPLSQL_INVALID_OBJECTS');
    assert.strictEqual(diags[0].severity, 1);
    assert.match(diags[0].message, /Schema UT3 contém 2 objetos inválidos/);
    assert.match(diags[0].message, /PKG_A \(PACKAGE BODY\)/);
    assert.match(diags[0].message, /UT3_T \(TYPE\)/);
    assert.strictEqual(diags[0].command?.command, 'utplsql.recompileUt3');
  }));

test('validateUtplsqlInstall: linhas em formato objeto (OUT_FORMAT_OBJECT) sao normalizadas', async () =>
  withConnEnv(async () => {
    __resetConfigValues();
    const v = new SetupValidator();
    const fake = makeFakeOracledb({
      rows: [{ OBJECT_NAME: 'PKG_A', OBJECT_TYPE: 'PACKAGE' }],
    });
    const diags = await v.validateUtplsqlInstall(fake as any);
    assert.strictEqual(diags.length, 1);
    assert.match(diags[0].message, /PKG_A \(PACKAGE\)/);
  }));

test('validateUtplsqlInstall: zero objetos invalidos nao gera diagnostic', async () =>
  withConnEnv(async () => {
    __resetConfigValues();
    const v = new SetupValidator();
    const diags = await v.validateUtplsqlInstall(makeFakeOracledb({ rows: [] }) as any);
    assert.strictEqual(diags.length, 0);
  }));

test('validateUtplsqlInstall: erro na query e ignorado silenciosamente', async () =>
  withConnEnv(async () => {
    __resetConfigValues();
    const v = new SetupValidator();
    const diags = await v.validateUtplsqlInstall(makeFakeOracledb({ throwOnExecute: true }) as any);
    assert.strictEqual(diags.length, 0);
  }));

test('validateUtplsqlInstall: falha de conexao nao gera diagnostic', async () =>
  withConnEnv(async () => {
    __resetConfigValues();
    const v = new SetupValidator();
    const diags = await v.validateUtplsqlInstall(makeFakeOracledb({ throwOnConnect: true }) as any);
    assert.strictEqual(diags.length, 0);
  }));

test('validateUtplsqlInstall: setupDiagnosticsEnabled false suprime verificacao', async () =>
  withConnEnv(async () => {
    __setConfigValue('setupDiagnostics.enabled', false);
    try {
      const v = new SetupValidator();
      const diags = await v.validateUtplsqlInstall(
        makeFakeOracledb({ rows: [['PKG_A', 'PACKAGE']] }) as any,
      );
      assert.strictEqual(diags.length, 0);
    } finally {
      __resetConfigValues();
    }
  }));

test('validateUtplsqlInstall: runnerMode cli pula verificacao', async () =>
  withConnEnv(async () => {
    __setConfigValue('runnerMode', 'cli');
    try {
      const v = new SetupValidator();
      const diags = await v.validateUtplsqlInstall(
        makeFakeOracledb({ rows: [['PKG_A', 'PACKAGE']] }) as any,
      );
      assert.strictEqual(diags.length, 0);
    } finally {
      __resetConfigValues();
    }
  }));

test('validateUtplsqlInstall: sem conexao configurada nao gera diagnostic nem prompt', async () => {
  const origEnv = process.env.UTPLSQL_CONN;
  delete process.env.UTPLSQL_CONN;
  __resetConfigValues();
  try {
    const v = new SetupValidator();
    const diags = await v.validateUtplsqlInstall(makeFakeOracledb() as any);
    assert.strictEqual(diags.length, 0);
  } finally {
    process.env.UTPLSQL_CONN = origEnv;
  }
});

test('recompileUt3: remove diagnostic quando recompilacao resolve', async () =>
  withConnEnv(async () => {
    __resetConfigValues();
    const v = new SetupValidator();
    v.applyDiagnostics([
      { code: 'UTPLSQL_INVALID_OBJECTS', severity: 1, message: 'inválidos' },
      { code: 'OUTRO', severity: 1, message: 'outro' },
    ]);
    const fake = makeFakeOracledb({ rows: [] });
    await v.recompileUt3(fake as any);
    const diags = v.getDiagnostics();
    assert.strictEqual(
      diags.some((d) => d.code === 'UTPLSQL_INVALID_OBJECTS'),
      false,
    );
    assert.strictEqual(
      diags.some((d) => d.code === 'OUTRO'),
      true,
    );
  }));

test('recompileUt3: mantem diagnostic quando ainda ha invalidos', async () =>
  withConnEnv(async () => {
    __resetConfigValues();
    const v = new SetupValidator();
    v.applyDiagnostics([{ code: 'UTPLSQL_INVALID_OBJECTS', severity: 1, message: 'inválidos' }]);
    const fake = makeFakeOracledb({ rows: [['PKG_A', 'PACKAGE']] });
    await v.recompileUt3(fake as any);
    const diags = v.getDiagnostics();
    assert.strictEqual(
      diags.some((d) => d.code === 'UTPLSQL_INVALID_OBJECTS'),
      true,
    );
  }));

test('recompileUt3: sem conexao mostra erro e nao quebra', async () => {
  const origEnv = process.env.UTPLSQL_CONN;
  delete process.env.UTPLSQL_CONN;
  __resetConfigValues();
  try {
    const v = new SetupValidator();
    await assert.doesNotReject(() => v.recompileUt3(makeFakeOracledb() as any));
  } finally {
    process.env.UTPLSQL_CONN = origEnv;
  }
});

test('checkCli: retorna false quando arquivo nao existe', () => {
  const v = new SetupValidator();
  assert.strictEqual(v.checkCli('/caminho/inexistente/utplsql'), false);
});

test('checkCli: retorna true quando arquivo existe', () => {
  const v = new SetupValidator();
  assert.strictEqual(v.checkCli(process.execPath), true);
});

test('applyDiagnostics: array vazio nao quebra', () => {
  const v = new SetupValidator();
  assert.doesNotThrow(() => v.applyDiagnostics([]));
});

test('applyDiagnostics: aplica diagnostico unico', () => {
  const v = new SetupValidator();
  const diags = [
    {
      code: 'UTPLSQL_NO_CLI',
      severity: 0,
      message: 'CLI not found',
      command: { title: 'Fix', command: 'test' },
    },
  ];
  assert.doesNotThrow(() => v.applyDiagnostics(diags));
  v.clear();
});

test('applyDiagnostics: multiplos diagnosticos', () => {
  const v = new SetupValidator();
  const diags = [
    { code: 'A', severity: 0, message: 'msg A' },
    { code: 'B', severity: 1, message: 'msg B' },
  ];
  assert.doesNotThrow(() => v.applyDiagnostics(diags));
  v.clear();
});

test('addCoverageDiagnostic: nao quebra', () => {
  const v = new SetupValidator();
  assert.doesNotThrow(() => v.addCoverageDiagnostic());
  v.clear();
});

test('clear: nao quebra', () => {
  const v = new SetupValidator();
  assert.doesNotThrow(() => v.clear());
});

test('dispose: nao quebra', () => {
  const v = new SetupValidator();
  assert.doesNotThrow(() => v.dispose());
});
