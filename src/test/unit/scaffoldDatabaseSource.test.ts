import './setup.js';
import assert from 'node:assert';
import { mock, test } from 'node:test';
import {
  __getWarningMessages,
  __getWrittenFile,
  __resetConfigValues,
  __resetMessages,
  __resetMockFiles,
  __resetWrittenFiles,
  __setActiveTextEditor,
  __setConfigValue,
  __setInputBoxResult,
  commands,
  workspace,
} from '../vscode-stub';

// Cobre o caminho "fonte do banco" do `generateTestSuite` (PRD-100) sem Oracle:
// `fetchDbObjectSource` é mockado; o restante do comando é real.
let capturedUri: { path?: string; toString?: () => string } | undefined;
let dbText = '';

mock.module('../../dbSourceProvider.js', {
  namedExports: {
    fetchDbObjectSource: async (uri: { path?: string; toString?: () => string }) => {
      capturedUri = uri;
      return dbText;
    },
  },
});

const PROJ = '/proj';
const SPEC = `CREATE OR REPLACE PACKAGE app_pkg IS
  PROCEDURE is_valid(p_id IN NUMBER);
END app_pkg;
`;

let registerScaffoldCommands: ((context: never) => void) | undefined;

async function register(): Promise<void> {
  if (!registerScaffoldCommands) {
    ({ registerScaffoldCommands } = await import('../../commands/scaffold.js'));
  }
  commands.__resetRegisteredCommands();
  __resetMessages();
  __resetConfigValues();
  __resetMockFiles();
  __resetWrittenFiles();
  __setActiveTextEditor(undefined);
  __setInputBoxResult(undefined);
  __setConfigValue('language', 'pt-br');
  workspace.__setWorkspaceFolders([{ uri: { fsPath: PROJ }, name: 'proj', index: 0 }]);
  registerScaffoldCommands({ subscriptions: [] } as never);
}

const run = () => commands.__getRegisteredCommand('utplsql.generateTestSuite')?.();

test('generateTestSuite: objeto do banco com schema gera a suíte na raiz do workspace', async () => {
  await register();
  dbText = SPEC;
  __setInputBoxResult('app.app_pkg');

  await run();

  assert.strictEqual(capturedUri?.path, '/APP/APP_PKG.pks');
  const sql = __getWrittenFile(`${PROJ}/ut_APP_PKG.pks`) ?? '';
  assert.ok(sql.includes('CREATE OR REPLACE PACKAGE ut_APP_PKG IS'));
  assert.ok(sql.includes('--%test(is_valid)'));
});

test('generateTestSuite: objeto do banco sem schema usa o usuário da conexão', async () => {
  await register();
  dbText = SPEC;
  __setInputBoxResult('app_pkg');

  await run();

  assert.strictEqual(capturedUri?.path, '/APP_PKG.pks');
  assert.ok((__getWrittenFile(`${PROJ}/ut_APP_PKG.pks`) ?? '').includes('%suite(APP_PKG)'));
});

test('generateTestSuite: texto vazio vindo do banco avisa e não escreve', async () => {
  await register();
  dbText = '   ';
  __setInputBoxResult('APP.APP_PKG');

  await run();

  assert.strictEqual(__getWrittenFile(`${PROJ}/ut_APP_PKG.pks`), undefined);
  assert.strictEqual(__getWarningMessages().length, 1);
});

test('generateTestSuite: input vazio após trim avisa e não consulta o banco', async () => {
  await register();
  capturedUri = undefined;
  __setInputBoxResult('   ');

  await run();

  assert.strictEqual(capturedUri, undefined);
  assert.strictEqual(__getWrittenFile(`${PROJ}/ut_APP_PKG.pks`), undefined);
  assert.strictEqual(__getWarningMessages().length, 1);
});
