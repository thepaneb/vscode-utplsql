import './setup.js';
import assert from 'node:assert';
import { mock, test } from 'node:test';
import type { CommandDeps } from '../../commands/deps';
import {
  __getClipboardText,
  __getErrorMessages,
  __getInformationMessages,
  __getWarningMessages,
  __resetConfigValues,
  __resetMessages,
  commands,
} from '../vscode-stub';

// Cobre `commands/utility.ts` mockando `quickfix` (setupValidator) e
// `oracleRunner` (rebuildAnnotationCache) — nenhum banco real é tocado.

const quickfixCalls: string[] = [];
let appliedDiags: unknown[] = [];
let activationDiags: unknown[] = [{ code: 'FAKE' }];

mock.module('../../quickfix.js', {
  namedExports: {
    setupValidator: {
      validateOnActivation: async () => {
        quickfixCalls.push('validateOnActivation');
        return activationDiags;
      },
      validateUtplsqlInstall: async () => {
        quickfixCalls.push('validateUtplsqlInstall');
        return [];
      },
      applyDiagnostics: (diags: unknown[]) => {
        quickfixCalls.push('applyDiagnostics');
        appliedDiags = diags;
      },
      recompileUt3: async () => {
        quickfixCalls.push('recompileUt3');
      },
    },
  },
});

let rebuildCalled = 0;
let rebuildShouldThrow = false;
mock.module('../../oracleRunner.js', {
  namedExports: {
    rebuildAnnotationCache: async () => {
      rebuildCalled += 1;
      if (rebuildShouldThrow) throw new Error('boom');
    },
  },
});

let refreshCount = 0;

function makeDeps(): CommandDeps {
  return {
    controller: {} as never,
    state: {} as never,
    getStatusBar: () => undefined,
    getDecorationManager: () => undefined,
    refresh: async () => {
      refreshCount += 1;
    },
  };
}

async function register() {
  commands.__resetRegisteredCommands();
  __resetMessages();
  __resetConfigValues();
  quickfixCalls.length = 0;
  appliedDiags = [];
  activationDiags = [{ code: 'FAKE' }];
  rebuildCalled = 0;
  rebuildShouldThrow = false;
  refreshCount = 0;
  const { registerUtilityCommands } = await import('../../commands/utility.js');
  registerUtilityCommands({ subscriptions: [] } as never, makeDeps());
}

test('refresh: delega para deps.refresh', async () => {
  await register();
  await commands.__getRegisteredCommand('utplsql.refresh')?.();
  assert.strictEqual(refreshCount, 1);
});

test('copyGrantsToClipboard: copia os grants e informa', async () => {
  await register();
  await commands.__getRegisteredCommand('utplsql.copyGrantsToClipboard')?.();
  const text = __getClipboardText();
  assert.ok(text.includes('GRANT EXECUTE ON SYS.DBMS_PROFILER'));
  assert.ok(text.includes('GRANT EXECUTE ON SYS.DBMS_PLSQL_CODE_COVERAGE'));
  assert.deepStrictEqual(__getInformationMessages(), ['Grants copiados para o clipboard.']);
});

test('validateSetup: roda validações, aplica diagnósticos e informa a contagem', async () => {
  await register();
  await commands.__getRegisteredCommand('utplsql.validateSetup')?.();
  assert.deepStrictEqual(quickfixCalls, [
    'validateOnActivation',
    'validateUtplsqlInstall',
    'applyDiagnostics',
  ]);
  assert.strictEqual(appliedDiags.length, 1);
  assert.deepStrictEqual(__getInformationMessages(), [
    '1 problema(s) de configuração encontrado(s). Veja o Problems Panel.',
  ]);
});

test('validateSetup: sem diagnósticos informa que está OK', async () => {
  await register();
  activationDiags = [];
  await commands.__getRegisteredCommand('utplsql.validateSetup')?.();
  assert.deepStrictEqual(__getInformationMessages(), [
    'Configuração utPLSQL OK — nenhum problema encontrado.',
  ]);
});

test('recompileUt3: delega para setupValidator.recompileUt3', async () => {
  await register();
  await commands.__getRegisteredCommand('utplsql.recompileUt3')?.();
  assert.ok(quickfixCalls.includes('recompileUt3'));
});

test('rebuildAnnotations: sem conexão avisa e não reconstrói', async () => {
  await register();
  const orig = process.env.UTPLSQL_CONN;
  delete process.env.UTPLSQL_CONN;
  try {
    await commands.__getRegisteredCommand('utplsql.rebuildAnnotations')?.();
    assert.deepStrictEqual(__getWarningMessages(), ['Conexão Oracle não informada.']);
    assert.strictEqual(rebuildCalled, 0);
  } finally {
    if (orig !== undefined) process.env.UTPLSQL_CONN = orig;
  }
});

test('rebuildAnnotations: com conexão reconstrói o cache e dá refresh', async () => {
  await register();
  const orig = process.env.UTPLSQL_CONN;
  process.env.UTPLSQL_CONN = 'u/p@//h:1521/s';
  try {
    await commands.__getRegisteredCommand('utplsql.rebuildAnnotations')?.();
    assert.strictEqual(rebuildCalled, 1);
    assert.strictEqual(refreshCount, 1);
    assert.deepStrictEqual(__getInformationMessages(), ['Cache de anotações reconstruído.']);
    assert.deepStrictEqual(__getErrorMessages(), []);
  } finally {
    if (orig === undefined) delete process.env.UTPLSQL_CONN;
    else process.env.UTPLSQL_CONN = orig;
  }
});

test('rebuildAnnotations: falha na reconstrução vira mensagem de erro', async () => {
  await register();
  rebuildShouldThrow = true;
  const orig = process.env.UTPLSQL_CONN;
  process.env.UTPLSQL_CONN = 'u/p@//h:1521/s';
  try {
    await commands.__getRegisteredCommand('utplsql.rebuildAnnotations')?.();
    assert.deepStrictEqual(__getErrorMessages(), ['boom']);
    assert.strictEqual(refreshCount, 0);
  } finally {
    if (orig === undefined) delete process.env.UTPLSQL_CONN;
    else process.env.UTPLSQL_CONN = orig;
  }
});
