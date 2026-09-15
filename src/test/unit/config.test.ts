import './setup.js';
import assert from 'node:assert';
import { test } from 'node:test';
import {
  clearSessionConnection,
  readConfig,
  resolveConnection,
  resolveConnectionNoPrompt,
} from '../../config';
import { __resetConfigValues, __setConfigValue, __setInputBoxResult } from '../vscode-stub';

test('readConfig: defaults sao usados quando sem config', () => {
  const cfg = readConfig();
  assert.strictEqual(cfg.sourcePath, 'install');
  assert.strictEqual(cfg.coverageOwner, '');
  assert.strictEqual(cfg.includePatterns.length, 1);
  assert.strictEqual(cfg.includePatterns[0], '**/*.pks');
  assert.strictEqual(cfg.timeoutMinutes, 60);
  assert.strictEqual(cfg.dbmsOutput, false);
});

test('readConfig: sqlCoverageEnabled default e false', () => {
  const cfg = readConfig();
  assert.strictEqual(cfg.sqlCoverageEnabled, false);
});

test('readConfig: scriptRunner defaults', () => {
  const cfg = readConfig();
  assert.strictEqual(cfg.scriptRunnerStopOnError, true);
  assert.strictEqual(cfg.scriptRunnerAutoCommit, true);
  assert.strictEqual(cfg.scriptRunnerFilePattern, '**/*.{sql,pks,pkb,fnc,prc,trg}');
  assert.strictEqual(cfg.scriptRunnerDbmsOutput, false);
  assert.strictEqual(cfg.scriptRunnerTimeoutSeconds, 300);
});

async function withCleanResolve(fn: () => Promise<void>): Promise<void> {
  clearSessionConnection();
  await fn();
}

test('resolveConnection: retorna undefined quando sem configuracao', async () =>
  withCleanResolve(async () => {
    const origEnv = process.env.UTPLSQL_CONN;
    delete process.env.UTPLSQL_CONN;
    try {
      const result = await resolveConnection();
      assert.strictEqual(result, undefined);
    } finally {
      process.env.UTPLSQL_CONN = origEnv;
    }
  }));

test('resolveConnection: usa env var UTPLSQL_CONN quando setting vazio', async () =>
  withCleanResolve(async () => {
    const origEnv = process.env.UTPLSQL_CONN;
    process.env.UTPLSQL_CONN = 'user/pass@db';
    try {
      const result = await resolveConnection();
      assert.strictEqual(result, 'user/pass@db');
    } finally {
      process.env.UTPLSQL_CONN = origEnv;
    }
  }));

test('clearSessionConnection: nao lanca erro', () => {
  clearSessionConnection();
  assert.ok(true);
});

test('resolveConnection: usa setting utplsql.connection quando presente', async () =>
  withCleanResolve(async () => {
    __setConfigValue('connection', 'user/setting@db');
    const origEnv = process.env.UTPLSQL_CONN;
    delete process.env.UTPLSQL_CONN;
    try {
      const result = await resolveConnection();
      assert.strictEqual(result, 'user/setting@db');
    } finally {
      process.env.UTPLSQL_CONN = origEnv;
      __resetConfigValues();
    }
  }));

test('resolveConnection: retorna undefined quando input box cancelado', async () =>
  withCleanResolve(async () => {
    __setInputBoxResult(undefined);
    const origEnv = process.env.UTPLSQL_CONN;
    delete process.env.UTPLSQL_CONN;
    try {
      const result = await resolveConnection();
      assert.strictEqual(result, undefined);
    } finally {
      process.env.UTPLSQL_CONN = origEnv;
      __setInputBoxResult(undefined);
    }
  }));

test('resolveConnection: usa input box quando tudo vazio e usuario digita', async () =>
  withCleanResolve(async () => {
    __setInputBoxResult('user/digitou@db');
    const origEnv = process.env.UTPLSQL_CONN;
    delete process.env.UTPLSQL_CONN;
    try {
      const result = await resolveConnection();
      assert.strictEqual(result, 'user/digitou@db');
    } finally {
      process.env.UTPLSQL_CONN = origEnv;
      clearSessionConnection();
      __setInputBoxResult(undefined);
    }
  }));

test('resolveConnection: usa cache da sessao em chamadas subsequentes', async () =>
  withCleanResolve(async () => {
    __setInputBoxResult('user/cached@db');
    const origEnv = process.env.UTPLSQL_CONN;
    delete process.env.UTPLSQL_CONN;
    try {
      const first = await resolveConnection();
      assert.strictEqual(first, 'user/cached@db');

      const second = await resolveConnection();
      assert.strictEqual(second, 'user/cached@db');
    } finally {
      process.env.UTPLSQL_CONN = origEnv;
      clearSessionConnection();
      __setInputBoxResult(undefined);
    }
  }));

test('resolveConnection: prefere env var sobre cache da sessao', async () =>
  withCleanResolve(async () => {
    __setInputBoxResult('user/cached@db');
    const origEnv = process.env.UTPLSQL_CONN;
    process.env.UTPLSQL_CONN = 'user/env@db';
    try {
      const first = await resolveConnection();
      assert.strictEqual(first, 'user/env@db');
    } finally {
      process.env.UTPLSQL_CONN = origEnv;
      clearSessionConnection();
      __setInputBoxResult(undefined);
    }
  }));

test('resolveConnectionNoPrompt: retorna undefined sem configuracao (sem prompt)', async () =>
  withCleanResolve(async () => {
    __setInputBoxResult('user/nao-deveria-aparecer@db');
    const origEnv = process.env.UTPLSQL_CONN;
    delete process.env.UTPLSQL_CONN;
    try {
      const result = resolveConnectionNoPrompt();
      assert.strictEqual(result, undefined);
    } finally {
      process.env.UTPLSQL_CONN = origEnv;
      __setInputBoxResult(undefined);
    }
  }));

test('resolveConnectionNoPrompt: usa env var UTPLSQL_CONN', () => {
  const origEnv = process.env.UTPLSQL_CONN;
  process.env.UTPLSQL_CONN = 'user/env@db';
  try {
    assert.strictEqual(resolveConnectionNoPrompt(), 'user/env@db');
  } finally {
    process.env.UTPLSQL_CONN = origEnv;
  }
});

test('resolveConnectionNoPrompt: usa setting utplsql.connection', () => {
  __setConfigValue('connection', 'user/setting@db');
  const origEnv = process.env.UTPLSQL_CONN;
  delete process.env.UTPLSQL_CONN;
  try {
    assert.strictEqual(resolveConnectionNoPrompt(), 'user/setting@db');
  } finally {
    process.env.UTPLSQL_CONN = origEnv;
    __resetConfigValues();
  }
});

test('resolveConnectionNoPrompt: usa perfil ativo antes do setting', () => {
  __setConfigValue('profiles', [{ id: 'p1', name: 'DEV', connection: 'dev/profile@db' }]);
  __setConfigValue('activeProfile', 'p1');
  __setConfigValue('connection', 'user/setting@db');
  const origEnv = process.env.UTPLSQL_CONN;
  delete process.env.UTPLSQL_CONN;
  try {
    assert.strictEqual(resolveConnectionNoPrompt(), 'dev/profile@db');
  } finally {
    process.env.UTPLSQL_CONN = origEnv;
    __resetConfigValues();
  }
});

test('readConfig: perfil ativo sobrescreve settings globais', () => {
  __setConfigValue('profiles', [
    {
      id: 'p1',
      name: 'DEV',
      connection: 'dev/pass@db',
      sourcePath: 'db/dev',
      coverageOwner: 'APP',
    },
  ]);
  __setConfigValue('activeProfile', 'p1');
  __setConfigValue('sourcePath', 'install');
  try {
    const cfg = readConfig();
    assert.strictEqual(cfg.sourcePath, 'db/dev');
    assert.strictEqual(cfg.coverageOwner, 'APP');
  } finally {
    __resetConfigValues();
  }
});
