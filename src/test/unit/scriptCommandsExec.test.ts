import './setup.js';
import assert from 'node:assert';
import { mock, test } from 'node:test';
import {
  __resetConfigValues,
  __resetMessages,
  __resetMockDirectoryEntries,
  __resetMockFiles,
  __resetOutputChannels,
  __setActiveTextEditor,
  __setConfigValue,
  __setMockDirectoryEntries,
  __setMockFile,
  __setQuickPickResult,
  commands,
  Uri,
} from '../vscode-stub';

// Cobre o caminho de execução de `commands/script.ts` (runScriptText /
// runScriptFiles) com o scriptRunner mockado — sem banco.

const executeCalls: Array<Record<string, unknown>> = [];
const connectCalls: Array<{ connection: string; options: unknown }> = [];

mock.module('../../scriptRunner.js', {
  namedExports: {
    splitScript: (text: string) => (text.trim() ? [{ sql: text, line: 1 }] : []),
    connectOracle: async (connection: string, options: unknown) => {
      connectCalls.push({ connection, options });
      return { mockConnection: true };
    },
    executeScript: async (
      connect: (connection: string) => Promise<unknown>,
      options: Record<string, unknown>,
    ) => {
      executeCalls.push(options);
      await connect(String(options.connection));
    },
    decodeScript: (bytes: Uint8Array) => Buffer.from(bytes).toString('utf8'),
    filterScriptFiles: (paths: string[]) => paths,
  },
});

function configureProfile(charset?: 'utf8' | 'latin1' | 'win1252') {
  const profile = {
    id: 'p1',
    name: 'DEV',
    connection: 'u@//h:1521/s',
    ...(charset ? { charset } : {}),
  };
  __setConfigValue('profiles', [profile]);
  __setConfigValue('activeProfile', 'p1');
  __setQuickPickResult({ profile });
}

function configureScriptOptions() {
  __setConfigValue('scriptRunner.timeoutSeconds', 37);
  __setConfigValue('scriptRunner.autoCommit', false);
  __setConfigValue('scriptRunner.stopOnError', false);
  __setConfigValue('scriptRunner.dbmsOutput', true);
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
  __resetMockDirectoryEntries();
  __resetMockFiles();
  __resetOutputChannels();
  __resetConfigValues();
  __setActiveTextEditor(undefined);
  executeCalls.length = 0;
  connectCalls.length = 0;
  const { registerScriptCommands } = await import('../../commands/script.js');
  registerScriptCommands({ subscriptions: [] } as never);
}

test('runScript: executa o texto do editor ativo no perfil com opções do runner', async () => {
  await register();
  configureProfile();
  configureScriptOptions();
  __setActiveTextEditor(editor('/tmp/a.sql', 'select 1 from dual;'));
  await commands.__getRegisteredCommand('utplsql.runScript')?.();
  assert.strictEqual(executeCalls.length, 1);
  assert.strictEqual((executeCalls[0].statements as unknown[]).length, 1);
  assert.strictEqual(executeCalls[0].connection, 'u@//h:1521/s');
  assert.strictEqual(executeCalls[0].autoCommit, false);
  assert.strictEqual(executeCalls[0].stopOnError, false);
  assert.strictEqual(executeCalls[0].dbmsOutput, true);
  assert.strictEqual(executeCalls[0].charset, undefined);
  assert.deepStrictEqual(connectCalls, [
    { connection: 'u@//h:1521/s', options: { timeoutSeconds: 37 } },
  ]);
});

test('runScriptFile: lê, decodifica e executa o arquivo com charset do perfil', async () => {
  await register();
  configureProfile('win1252');
  configureScriptOptions();
  __setMockFile('**/*.sql', '/tmp/a.sql', 'select 1 from dual;');
  await commands.__getRegisteredCommand('utplsql.runScriptFile')?.(Uri.file('/tmp/a.sql'));
  assert.strictEqual(executeCalls.length, 1);
  assert.strictEqual(executeCalls[0].label, 'a.sql');
  assert.strictEqual(executeCalls[0].charset, 'win1252');
  assert.deepStrictEqual(connectCalls, [
    { connection: 'u@//h:1521/s', options: { timeoutSeconds: 37 } },
  ]);
});

test('runScriptFile: sem URI usa o documento do editor ativo', async () => {
  await register();
  configureProfile('latin1');
  __setActiveTextEditor(editor('/tmp/from-editor.sql', 'select 1 from dual;'));
  __setMockFile('**/*.sql', '/tmp/from-editor.sql', 'select 1 from dual;');
  await commands.__getRegisteredCommand('utplsql.runScriptFile')?.();
  assert.strictEqual(executeCalls.length, 1);
  assert.strictEqual(executeCalls[0].label, 'from-editor.sql');
  assert.strictEqual(executeCalls[0].charset, 'latin1');
});

test('runScriptFolder: sem URI usa o documento do editor e filtra a pasta', async () => {
  await register();
  configureProfile('win1252');
  __setActiveTextEditor(editor('/tmp/scripts', ''));
  __setMockDirectoryEntries('/tmp/scripts', [['a.sql', 1]]);
  __setMockFile('**/*.sql', '/tmp/scripts/a.sql', 'select 1 from dual;');
  await commands.__getRegisteredCommand('utplsql.runScriptFolder')?.();
  assert.strictEqual(executeCalls.length, 1);
  assert.strictEqual(executeCalls[0].label, 'a.sql');
  assert.strictEqual(executeCalls[0].charset, 'win1252');
});
