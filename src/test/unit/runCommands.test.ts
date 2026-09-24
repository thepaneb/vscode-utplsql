import './setup.js';
import assert from 'node:assert';
import { test } from 'node:test';
import type { CommandDeps } from '../../commands/deps';
import { registerRunCommands } from '../../commands/run';
import { TestStateManager } from '../../state';
import {
  __getInformationMessages,
  __getWarningMessages,
  __resetMessages,
  __setActiveTextEditor,
  commands,
} from '../vscode-stub';

// Cobre os handlers de `commands/run.ts` (guardas e despacho) sem banco:
// nenhuma suite descoberta → os comandos avisam e retornam antes de executar.
// O caminho de execução real (executeRun) é coberto por runner.test.ts.

const PKS = `CREATE OR REPLACE PACKAGE test_math IS
  --%suite(Math)
  --%test(Adds)
  PROCEDURE add;
END;`;

function makeDeps(state: TestStateManager): CommandDeps {
  return {
    controller: { items: { forEach: () => {} } } as never,
    state,
    getStatusBar: () => undefined,
    getDecorationManager: () => undefined,
    refresh: async () => {},
  };
}

function setup() {
  commands.__resetRegisteredCommands();
  __resetMessages();
  commands.__resetExecutedCommands();
  commands.__setExecuteCommandImpl(() => undefined);
  const state = new TestStateManager();
  registerRunCommands({ subscriptions: [] } as never, makeDeps(state));
  return state;
}

function editor(fileName: string, text: string, line: number) {
  return {
    document: {
      fileName,
      uri: { fsPath: fileName, path: fileName, scheme: 'file', toString: () => fileName },
      getText: () => text,
    },
    selection: { active: { line } },
  } as never;
}

test('runAtCursor: sem editor ativo avisa', async () => {
  setup();
  __setActiveTextEditor(undefined);
  await commands.__getRegisteredCommand('utplsql.runAtCursor')?.();
  assert.deepStrictEqual(__getWarningMessages(), [
    'Executar no cursor disponível apenas em arquivos .pks.',
  ]);
});

test('runAtCursor: arquivo que não é .pks avisa', async () => {
  setup();
  __setActiveTextEditor(editor('/tmp/foo.sql', PKS, 1));
  await commands.__getRegisteredCommand('utplsql.runAtCursor')?.();
  assert.deepStrictEqual(__getWarningMessages(), [
    'Executar no cursor disponível apenas em arquivos .pks.',
  ]);
});

test('runAtCursor: sem anotação na linha avisa', async () => {
  setup();
  __setActiveTextEditor(editor('/tmp/test_math.pks', PKS, 0));
  await commands.__getRegisteredCommand('utplsql.runAtCursor')?.();
  assert.deepStrictEqual(__getWarningMessages(), [
    'Nenhuma anotação %suite/%test encontrada na posição.',
  ]);
});

test('runAtCursor: anotação de suite tenta rodar o arquivo (sem suites avisa)', async () => {
  setup();
  __setActiveTextEditor(editor('/tmp/test_math.pks', PKS, 1));
  await commands.__getRegisteredCommand('utplsql.runAtCursor')?.();
  assert.deepStrictEqual(__getWarningMessages(), [
    'Nenhuma suite utPLSQL encontrada neste arquivo.',
  ]);
});

test('runAtCursor: anotação de teste sem suite conhecida retorna em silêncio', async () => {
  setup();
  __setActiveTextEditor(editor('/tmp/test_math.pks', PKS, 2));
  await commands.__getRegisteredCommand('utplsql.runAtCursor')?.();
  assert.deepStrictEqual(__getWarningMessages(), []);
  assert.deepStrictEqual(__getInformationMessages(), []);
});

test('runFailed: sem falhas mostra informação e não executa', async () => {
  setup();
  await commands.__getRegisteredCommand('utplsql.runFailed')?.();
  assert.deepStrictEqual(__getInformationMessages(), ['Nenhum teste falhou na última execução.']);
});

test('rerunLast: sem execução anterior mostra informação', async () => {
  setup();
  await commands.__getRegisteredCommand('utplsql.rerunLast')?.();
  assert.deepStrictEqual(__getInformationMessages(), ['Nenhuma execução anterior para repetir.']);
});

test('rerunLast: última execução "all" dispara utplsql.runAll', async () => {
  const state = setup();
  state.setLastRun({ type: 'all', coverage: false });
  await commands.__getRegisteredCommand('utplsql.rerunLast')?.();
  assert.ok(commands.__getExecutedCommands().includes('utplsql.runAll'));
});

test('rerunLast: última execução "file" sem suites avisa', async () => {
  const state = setup();
  state.setLastRun({
    type: 'file',
    uri: { fsPath: '/tmp/test_math.pks', toString: () => '/tmp/test_math.pks' } as never,
    coverage: false,
  });
  await commands.__getRegisteredCommand('utplsql.rerunLast')?.();
  assert.deepStrictEqual(__getWarningMessages(), [
    'Nenhuma suite utPLSQL encontrada neste arquivo.',
  ]);
});

test('runLens: teste de suite inexistente retorna em silêncio', async () => {
  setup();
  await commands.__getRegisteredCommand('utplsql.runLens')?.({
    type: 'test',
    packageName: 'pkg',
    procName: 'proc',
    uri: 'file:///tmp/pkg.pks',
  });
  assert.deepStrictEqual(__getWarningMessages(), []);
});

test('runLens: suite dispara runForUri (sem suites avisa)', async () => {
  setup();
  await commands.__getRegisteredCommand('utplsql.runLens')?.({
    type: 'suite',
    packageName: 'pkg',
    uri: 'file:///tmp/pkg.pks',
  });
  assert.deepStrictEqual(__getWarningMessages(), [
    'Nenhuma suite utPLSQL encontrada neste arquivo.',
  ]);
});

test('showTestExplorer: revela a view de testes', async () => {
  setup();
  await commands.__getRegisteredCommand('utplsql.showTestExplorer')?.();
  assert.ok(commands.__getExecutedCommands().includes('workbench.view.testing'));
});

test('cancelRun: sem execução ativa não lança', async () => {
  setup();
  await assert.doesNotReject(
    async () => await commands.__getRegisteredCommand('utplsql.cancelRun')?.(),
  );
});
