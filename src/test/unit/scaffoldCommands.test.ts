import './setup.js';
import assert from 'node:assert';
import { test } from 'node:test';
import { registerScaffoldCommands } from '../../commands/scaffold.js';
import {
  __getInformationMessages,
  __getWarningMessages,
  __getWrittenFile,
  __resetConfigValues,
  __resetMessages,
  __resetMockFiles,
  __resetWrittenFiles,
  __setActiveTextEditor,
  __setConfigValue,
  __setInputBoxResult,
  __setMockFile,
  __setWarningResult,
  commands,
  languages,
  workspace,
} from '../vscode-stub';

// Cobre `commands/scaffold.ts` (PRD-59 + PRD-100) com o stub de `vscode`.

const PROJ = '/proj';
const SPEC = `CREATE OR REPLACE PACKAGE app_pkg IS
  PROCEDURE is_valid(p_id IN NUMBER);
  FUNCTION total RETURN NUMBER;
  PROCEDURE is_valid(p_name IN VARCHAR2);
END app_pkg;
`;

function editor(fileName: string, text = '') {
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
  languages.__resetCodeActionsProvider();
  __resetMessages();
  __resetConfigValues();
  __resetMockFiles();
  __resetWrittenFiles();
  __setActiveTextEditor(undefined);
  __setWarningResult(undefined);
  __setInputBoxResult(undefined);
  // pt-BR deixa as mensagens determinísticas
  __setConfigValue('language', 'pt-br');
  workspace.__setWorkspaceFolders([{ uri: { fsPath: PROJ }, name: 'proj', index: 0 }]);
  registerScaffoldCommands({ subscriptions: [] } as never);
}

const run = () => commands.__getRegisteredCommand('utplsql.generateTestSuite')?.();

test('generateTestSuite: gera um %test por rotina do arquivo ativo', async () => {
  await register();
  __setActiveTextEditor(editor(`${PROJ}/app_pkg.pkb`, SPEC));

  await run();

  assert.strictEqual(
    __getWrittenFile(`${PROJ}/ut_app_pkg.pks`),
    [
      'CREATE OR REPLACE PACKAGE ut_app_pkg IS',
      '  --%suite(app_pkg)',
      '',
      '  --%test(is_valid)',
      '  PROCEDURE is_valid; -- TODO',
      '',
      '  --%test(total)',
      '  PROCEDURE total; -- TODO',
      'END ut_app_pkg;',
      '/',
      '',
    ].join('\n'),
  );
  assert.deepStrictEqual(__getInformationMessages(), ['Suíte criada em ut_app_pkg.pks']);
});

test('generateTestSuite: sem rotinas gera o esqueleto da PRD-59', async () => {
  await register();
  __setActiveTextEditor(
    editor(`${PROJ}/vazio.pkb`, 'CREATE OR REPLACE PACKAGE vazio IS\nEND vazio;\n'),
  );

  await run();

  const sql = __getWrittenFile(`${PROJ}/ut_vazio.pks`) ?? '';
  assert.ok(sql.includes('--%test(TODO)'));
  assert.ok(sql.includes('PROCEDURE dummy; -- TODO'));
});

test('generateTestSuite: arquivo existente exige confirmação', async () => {
  await register();
  __setActiveTextEditor(editor(`${PROJ}/app_pkg.pkb`, SPEC));
  __setMockFile('ut_app_pkg.pks', `${PROJ}/ut_app_pkg.pks`, 'antigo');

  // recusa → não escreve
  __setWarningResult(undefined);
  await run();
  assert.strictEqual(__getWrittenFile(`${PROJ}/ut_app_pkg.pks`), undefined);
  assert.match(__getWarningMessages()[0] ?? '', /já existe\. Sobrescrever\?$/);

  // confirma → escreve (mensagem localizada)
  __setWarningResult('Sobrescrever');
  await run();
  assert.ok((__getWrittenFile(`${PROJ}/ut_app_pkg.pks`) ?? '').includes('%suite(app_pkg)'));
});

test('generateTestSuite: respeita as opções utplsql.generate.*', async () => {
  await register();
  __setConfigValue('generate.testPackagePrefix', 'test_');
  __setConfigValue('generate.generateComments', false);
  __setActiveTextEditor(editor(`${PROJ}/app_pkg.pks`, SPEC));

  await run();

  const sql = __getWrittenFile(`${PROJ}/test_app_pkg.pks`) ?? '';
  assert.ok(sql.includes('CREATE OR REPLACE PACKAGE test_app_pkg IS'));
  assert.ok(!sql.includes('TODO'));
});

test('generateTestSuite: sem editor e sem fonte do banco avisa', async () => {
  await register();
  await run();

  assert.deepStrictEqual(__getWarningMessages(), [
    'Nenhuma fonte encontrada. Abra um arquivo .pks/.pkb ou informe um objeto do banco.',
  ]);
});

test('generateTestSuite: sem workspace folder não tenta o banco', async () => {
  await register();
  workspace.__setWorkspaceFolders(undefined);

  await run();

  assert.strictEqual(__getWarningMessages().length, 1);
});

test('generateTestSuite: objeto do banco cancelado não escreve (sem workspace pai)', async () => {
  await register();
  // sem editor e sem palpite de objeto → o input box devolve undefined
  __setInputBoxResult(undefined);

  await run();

  assert.strictEqual(__getWarningMessages().length, 1);
});

test('Code Action: oferecida em produção, omitida em specs ut_* e em %suite', async () => {
  await register();
  const provider = languages.__getLastCodeActionsProvider();

  const production = provider.provideCodeActions({
    uri: { path: `${PROJ}/app_pkg.pkb` },
    getText: () => SPEC,
  });
  assert.deepStrictEqual(
    production.map((a) => a.title),
    ['utPLSQL: Gerar suíte de teste…'],
  );

  // prefixo ut_ → não é produção
  assert.deepStrictEqual(
    provider.provideCodeActions({
      uri: { path: `${PROJ}/ut_app_pkg.pks` },
      getText: () => 'CREATE OR REPLACE PACKAGE ut_app_pkg IS END;',
    }),
    [],
  );

  // arquivo com %suite (spec fora da convenção) também é excluído
  assert.deepStrictEqual(
    provider.provideCodeActions({
      uri: { path: `${PROJ}/outra_suite.pks` },
      getText: () => 'CREATE OR REPLACE PACKAGE outra_suite IS\n  --%suite(x)\nEND outra_suite;\n',
    }),
    [],
  );
});
