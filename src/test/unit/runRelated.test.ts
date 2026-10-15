import './setup.js';
import assert from 'node:assert';
import { test } from 'node:test';
import { registerRunCommands } from '../../commands/run.js';
import { TestStateManager } from '../../state.js';
import {
  __getErrorMessages,
  __getWarningMessages,
  __resetConfigValues,
  __resetMessages,
  __setActiveTextEditor,
  __setConfigValue,
  commands,
  workspace,
} from '../vscode-stub';

// Cobre `utplsql.runRelated` (PRD-58) com o stub de `vscode`: o caminho do
// comando é o que os unitários de `relatedSuiteMetas` (puros) não alcançam.

const PROJ = '/proj';

interface Captured {
  include?: unknown[];
}

function suiteItem(id: string, packageName: string) {
  return {
    id,
    label: packageName,
    children: [] as unknown[],
    uri: { fsPath: `${PROJ}/ut_${packageName}.pks`, scheme: 'file', toString: () => packageName },
    range: undefined,
  };
}

function makeRun() {
  return {
    appendOutput: () => {},
    enqueued: () => {},
    started: () => {},
    errored: () => {},
    passed: () => {},
    failed: () => {},
    skipped: () => {},
    addCoverage: () => {},
    end: () => {},
  };
}

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

/** Registra os comandos de run com um controller/estado mínimos. */
function harness(options: { suites?: string[] } = {}) {
  const state = new TestStateManager();
  const captured: Captured[] = [];
  const controller = {
    items: { forEach: (_cb: (i: unknown) => void) => {} },
    createTestRun: (request: Captured) => {
      captured.push(request);
      return makeRun();
    },
  };

  const metas: unknown[] = [];
  for (const pkg of options.suites ?? []) {
    const item = suiteItem(`suite:${pkg}`, pkg);
    state.setItem(item.id, item as never);
    state.setSuiteItem(item.id, item as never);
    state.setMeta(
      item as never,
      {
        kind: 'suite',
        packageName: pkg,
        uri: item.uri,
        folder: { uri: { fsPath: PROJ }, name: 'proj', index: 0 },
      } as never,
    );
    metas.push(item);
  }
  state.cachedItems = metas as never;

  registerRunCommands({ subscriptions: [] } as never, {
    controller: controller as never,
    state,
    getStatusBar: () => undefined,
    getDecorationManager: () => undefined,
    refresh: async () => {},
  });
  return { state, captured };
}

async function boot(options: { suites?: string[] } = {}) {
  commands.__resetRegisteredCommands();
  __resetMessages();
  __resetConfigValues();
  workspace.__setWorkspaceFolders([{ uri: { fsPath: PROJ }, name: 'proj', index: 0 }]);
  __setActiveTextEditor(undefined);
  __setConfigValue('language', 'pt-br');
  return harness(options);
}

const runRelated = () => commands.__getRegisteredCommand('utplsql.runRelated')?.();

test('runRelated: sem editor avisa e não executa nada', async () => {
  const { captured } = await boot({ suites: ['ut_app_pkg'] });

  await runRelated();

  assert.deepStrictEqual(__getWarningMessages(), [
    'Abra um arquivo de produção para rodar os testes relacionados.',
  ]);
  assert.strictEqual(captured.length, 0);
});

test('runRelated: sem suite correspondente avisa com o nome do arquivo', async () => {
  const { captured } = await boot({ suites: ['ut_outra_coisa'] });
  __setActiveTextEditor(editor(`${PROJ}/app_pkg.pkb`));

  await runRelated();

  assert.deepStrictEqual(__getWarningMessages(), [
    'Nenhuma suite relacionada a app_pkg.pkb foi encontrada.',
  ]);
  assert.strictEqual(captured.length, 0);
});

test('runRelated: executa a suite relacionada (request com a suite certa)', async () => {
  const { captured } = await boot({ suites: ['ut_app_pkg', 'ut_outra'] });
  // conexão configurada evita o prompt (o teste não toca o banco: a suite fake
  // não tem filhos, então o run sai em "sem testes")
  __setConfigValue('connection', 'u/p@//127.0.0.1:1/s');
  __setActiveTextEditor(editor(`${PROJ}/app_pkg.pkb`));

  await runRelated();

  assert.deepStrictEqual(__getWarningMessages(), []);
  assert.strictEqual(captured.length, 1, 'o run deveria ter sido criado');
  const include = (captured[0].include ?? []) as { id: string }[];
  assert.deepStrictEqual(
    include.map((i) => i.id),
    ['suite:ut_app_pkg'],
  );
});

test('runRelated: nome do arquivo sem base avisa (nenhum candidato)', async () => {
  const { captured } = await boot({ suites: ['ut_app_pkg'] });
  __setActiveTextEditor(editor(`${PROJ}/.pkb`));

  await runRelated();

  assert.match(__getWarningMessages()[0] ?? '', /^Nenhuma suite relacionada a \.pkb/);
  assert.strictEqual(captured.length, 0);
});

test('boot: sem workspace folder o run não é criado (guard do executeRun)', async () => {
  await boot({ suites: ['ut_app_pkg'] });
  // o harness monta o workspace; desmontamos para exercitar o guard
  workspace.__setWorkspaceFolders(undefined);
  __setConfigValue('connection', 'u/p@//127.0.0.1:1/s');
  __setActiveTextEditor(editor(`${PROJ}/app_pkg.pkb`));

  await runRelated();

  assert.deepStrictEqual(__getErrorMessages(), [
    'Abra uma pasta/projeto para rodar os testes utPLSQL.',
  ]);
});
