import './setup.js';
import assert from 'node:assert';
import { test } from 'node:test';
import { registerScriptCommands } from '../../commands/script';
import {
  __getInformationMessages,
  __getOutputChannelLines,
  __getWarningMessages,
  __resetConfigValues,
  __resetMessages,
  __resetMockDirectoryEntries,
  __resetMockFiles,
  __resetOutputChannels,
  __setActiveTextEditor,
  __setConfigValue,
  __setMockDirectoryEntries,
  __setMockFile,
  __setMockFileError,
  __setQuickPickResult,
  commands,
  FileType,
  Uri,
} from '../vscode-stub';

// Cobre os handlers de `commands/script.ts` sem banco. Os caminhos que chegam
// a executar SQL (runScriptText com statements) são exercitados por
// scriptRunner.test.ts; aqui ficam as guardas e o pipeline de leitura/erro.

function setup() {
  commands.__resetRegisteredCommands();
  __resetMessages();
  __resetMockFiles();
  __resetMockDirectoryEntries();
  __resetOutputChannels();
  __resetConfigValues();
  __setActiveTextEditor(undefined);
  __setQuickPickResult(undefined);
  registerScriptCommands({ subscriptions: [] } as never);
}

function configureProfile() {
  const profile = { id: 'p1', name: 'DEV', connection: 'u@//h:1521/s' };
  __setConfigValue('profiles', [profile]);
  __setConfigValue('activeProfile', 'p1');
  __setQuickPickResult({ profile });
}

test('runScript: sem editor ativo avisa', async () => {
  setup();
  await commands.__getRegisteredCommand('utplsql.runScript')?.();
  assert.deepStrictEqual(__getWarningMessages(), ['Nenhum editor ativo para executar o script.']);
});

test('runScriptFile: sem uri nem editor avisa', async () => {
  setup();
  await commands.__getRegisteredCommand('utplsql.runScriptFile')?.();
  assert.deepStrictEqual(__getWarningMessages(), ['Nenhum editor ativo para executar o script.']);
});

test('runScriptFolder: sem uri nem editor avisa', async () => {
  setup();
  await commands.__getRegisteredCommand('utplsql.runScriptFolder')?.();
  assert.deepStrictEqual(__getWarningMessages(), ['Nenhum editor ativo para executar o script.']);
});

test('runScript: seleção de perfil cancelada não executa', async () => {
  setup();
  const profile = { id: 'p1', name: 'DEV', connection: 'u@//h:1521/s' };
  __setConfigValue('profiles', [profile]);
  __setConfigValue('activeProfile', 'p1');
  __setQuickPickResult(undefined);
  __setActiveTextEditor({
    document: {
      fileName: '/tmp/a.sql',
      uri: { fsPath: '/tmp/a.sql', path: '/tmp/a.sql', scheme: 'file' },
      getText: () => 'select 1;',
    },
  } as never);
  await commands.__getRegisteredCommand('utplsql.runScript')?.();
  assert.deepStrictEqual(__getWarningMessages(), []);
  assert.deepStrictEqual(__getInformationMessages(), []);
  assert.deepStrictEqual(__getOutputChannelLines('utPLSQL Script'), []);
});

test('runScriptFile/Folder: seleção de perfil cancelada não executa', async () => {
  setup();
  const profile = { id: 'p1', name: 'DEV', connection: 'u@//h:1521/s' };
  __setConfigValue('profiles', [profile]);
  __setConfigValue('activeProfile', 'p1');
  __setQuickPickResult(undefined);
  __setMockDirectoryEntries('/tmp/scripts', [['a.sql', FileType.File]]);
  await commands.__getRegisteredCommand('utplsql.runScriptFile')?.(Uri.file('/tmp/a.sql'));
  await commands.__getRegisteredCommand('utplsql.runScriptFolder')?.(Uri.file('/tmp/scripts'));
  assert.deepStrictEqual(__getWarningMessages(), []);
  assert.deepStrictEqual(__getInformationMessages(), []);
});

test('runScriptFolder: alvo que não é pasta avisa', async () => {
  setup();
  // O stat do stub reconhece como arquivo o path presente em _mockFileContents.
  __setMockFile('**/*', '/tmp/notafolder.sql', 'select 1;');
  await commands.__getRegisteredCommand('utplsql.runScriptFolder')?.(
    Uri.file('/tmp/notafolder.sql'),
  );
  assert.deepStrictEqual(__getWarningMessages(), ['Selecione uma pasta para executar scripts.']);
});

test('runScriptFolder: pasta inexistente avisa', async () => {
  setup();
  await commands.__getRegisteredCommand('utplsql.runScriptFolder')?.(Uri.file('/tmp/inexistente'));
  assert.deepStrictEqual(__getWarningMessages(), ['Selecione uma pasta para executar scripts.']);
});

test('runScriptFolder: pasta sem scripts avisa', async () => {
  setup();
  configureProfile();
  __setMockDirectoryEntries('/tmp/scripts', [['readme.txt', FileType.File]]);
  await commands.__getRegisteredCommand('utplsql.runScriptFolder')?.(Uri.file('/tmp/scripts'));
  assert.deepStrictEqual(__getWarningMessages(), [
    'Nenhum arquivo de script encontrado nesta pasta.',
  ]);
});

test('runScriptFile: erro de leitura vai para o OutputChannel sem lançar', async () => {
  setup();
  configureProfile();
  __setMockFileError('/tmp/bad.sql', true);
  await commands.__getRegisteredCommand('utplsql.runScriptFile')?.(Uri.file('/tmp/bad.sql'));
  const lines = __getOutputChannelLines('utPLSQL Script');
  assert.ok(
    lines.some((l) => l.includes('bad.sql') && l.includes('mock read error')),
    `esperava o erro no canal, veio: ${JSON.stringify(lines)}`,
  );
});

test('runScriptFolder: recursão lista scripts e script vazio vira aviso', async () => {
  setup();
  configureProfile();
  __setMockDirectoryEntries('/tmp/scripts', [
    ['sub', FileType.Directory],
    ['a.sql', FileType.File],
  ]);
  __setMockDirectoryEntries('/tmp/scripts/sub', [['b.sql', FileType.File]]);
  await commands.__getRegisteredCommand('utplsql.runScriptFolder')?.(Uri.file('/tmp/scripts'));
  assert.deepStrictEqual(__getInformationMessages(), [
    'Nenhum statement SQL encontrado para executar.',
    'Nenhum statement SQL encontrado para executar.',
  ]);
});
