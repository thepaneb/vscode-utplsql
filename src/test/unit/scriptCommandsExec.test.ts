import './setup.js';
import assert from 'node:assert';
import { mock, test } from 'node:test';
import {
  __resetConfigValues,
  __resetMessages,
  __resetMockFiles,
  __resetOutputChannels,
  __setActiveTextEditor,
  __setConfigValue,
  __setMockFile,
  __setQuickPickResult,
  commands,
  Uri,
} from '../vscode-stub';

// Cobre o caminho de execução de `commands/script.ts` (runScriptText /
// runScriptFiles) com o scriptRunner mockado — sem banco.

const executeCalls: Array<Record<string, unknown>> = [];

mock.module('../../scriptRunner.js', {
  namedExports: {
    splitScript: (text: string) => (text.trim() ? [{ sql: text, line: 1 }] : []),
    connectOracle: async () => ({ mockConnection: true }),
    executeScript: async (_connect: unknown, options: Record<string, unknown>) => {
      executeCalls.push(options);
    },
    decodeScript: (bytes: Uint8Array) => Buffer.from(bytes).toString('utf8'),
    filterScriptFiles: (paths: string[]) => paths,
  },
});

function configureProfile() {
  const profile = { id: 'p1', name: 'DEV', connection: 'u@//h:1521/s' };
  __setConfigValue('profiles', [profile]);
  __setConfigValue('activeProfile', 'p1');
  __setQuickPickResult({ profile });
}

function editor(fileName: string, text: string) {
  return {
    document: {
      fileName,
      uri: { fsPath: fileName, path: fileName, scheme: 'file', toString: () => fileName },
      getText: () => text,
    },
    selection: { active: { line: 0 } },
  } as never;
}

async function register() {
  commands.__resetRegisteredCommands();
  __resetMessages();
  __resetMockFiles();
  __resetOutputChannels();
  __resetConfigValues();
  __setActiveTextEditor(undefined);
  executeCalls.length = 0;
  const { registerScriptCommands } = await import('../../commands/script.js');
  registerScriptCommands({ subscriptions: [] } as never);
}

test('runScript: executa o texto do editor ativo no perfil', async () => {
  await register();
  configureProfile();
  __setActiveTextEditor(editor('/tmp/a.sql', 'select 1 from dual;'));
  await commands.__getRegisteredCommand('utplsql.runScript')?.();
  assert.strictEqual(executeCalls.length, 1);
  assert.strictEqual((executeCalls[0].statements as unknown[]).length, 1);
  assert.strictEqual(executeCalls[0].connection, 'u@//h:1521/s');
});

test('runScriptFile: lê, decodifica e executa o arquivo', async () => {
  await register();
  configureProfile();
  __setMockFile('**/*.sql', '/tmp/a.sql', 'select 1 from dual;');
  await commands.__getRegisteredCommand('utplsql.runScriptFile')?.(Uri.file('/tmp/a.sql'));
  assert.strictEqual(executeCalls.length, 1);
  assert.strictEqual(executeCalls[0].label, 'a.sql');
});
