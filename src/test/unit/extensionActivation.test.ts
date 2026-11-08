import './setup.js';
import assert from 'node:assert';
import { mock, test } from 'node:test';
import { __setConfigValue, commands, Range, tests, window, workspace } from '../vscode-stub';

// Smoke de ativação de `extension.ts`: orquestra os registros e o wiring dos
// run profiles. `testTree`, `quickfix` e `commands/run` são mockados para não
// tocar banco.

let refreshCount = 0;
const resolveCalls: string[] = [];
const validateCalls: string[] = [];
let validateShouldThrow = false;
const runWithProgressCalls: unknown[][] = [];
const runUriCalls: unknown[][] = [];
let runIsRunning = false;
let cancelCalls = 0;
let capturedContext: { subscriptions: Array<{ dispose?: () => void }> } | undefined;
let capturedDeps: { getStatusBar: () => unknown; getDecorationManager: () => unknown } | undefined;

mock.module('../../commands/run.js', {
  namedExports: {
    registerRunCommands: (_context: unknown, deps: typeof capturedDeps) => {
      capturedDeps = deps;
      return {
        runWithProgress: async (...args: unknown[]) => {
          runWithProgressCalls.push(args);
        },
        runUri: async (...args: unknown[]) => {
          runUriCalls.push(args);
        },
        isRunning: () => runIsRunning,
        cancel: () => {
          cancelCalls += 1;
        },
      };
    },
  },
});

mock.module('../../testTree.js', {
  namedExports: {
    createRefresher: (
      _c: unknown,
      _s: unknown,
      perf?: {
        enabled: boolean;
        start: (phase: string) => () => void;
        record: (phase: string, ms: number) => void;
      },
    ) => {
      const refresher = async () => {
        void perf?.enabled;
        perf?.start('discovery')();
        perf?.record('buildTree', 1);
        refreshCount += 1;
      };
      refresher.refreshUri = async () => {
        refreshCount += 1;
      };
      refresher.removeUri = async () => {
        refreshCount += 1;
      };
      return refresher;
    },
    collectAllItems: () => [],
    resolveSchemaNode: async (_c: unknown, _s: unknown, item: { id: string }) => {
      resolveCalls.push(item.id);
    },
    resolvePackageNode: (_c: unknown, _s: unknown, item: { id: string }) => {
      resolveCalls.push(item.id);
    },
    resolveSuiteNode: (_c: unknown, _s: unknown, item: { id: string }) => {
      resolveCalls.push(item.id);
    },
  },
});

mock.module('../../quickfix.js', {
  namedExports: {
    setupValidator: {
      validateOnActivation: async () => {
        validateCalls.push('activation');
        if (validateShouldThrow) throw new Error('validation boom');
        return [];
      },
      validateUtplsqlInstall: async () => {
        validateCalls.push('install');
        return [];
      },
      applyDiagnostics: () => {
        validateCalls.push('apply');
      },
      recompileUt3: async () => {},
    },
    UtplsqlCodeActionProvider: class {
      provideCodeActions() {
        return [];
      }
    },
  },
});

const secrets = {
  get: async () => undefined,
  store: async () => {},
  delete: async () => {},
  onDidChange: () => ({ dispose: () => {} }),
};

function makeContext() {
  return { subscriptions: [], secrets } as never;
}

test('activate: cria o controller, seta o contexto e registra os comandos', async () => {
  __setConfigValue('perf.enabled', true);
  __setConfigValue('perf.reportFile', 'test-results/perf-test.jsonl');
  const { activate } = await import('../../extension.js');
  const context = makeContext() as { subscriptions: Array<{ dispose?: () => void }> };
  capturedContext = context;
  activate(context as never);

  assert.ok(commands.__getExecutedCommands().includes('setContext'));
  const controller = tests.__getLastTestController();
  assert.ok(controller, 'o TestController deveria ter sido criado');
  assert.strictEqual(controller?.id, 'utplsql');
  assert.ok(context.subscriptions.length > 0);

  // Deixa as promessas de ativação (profilesReady.then) rodarem.
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.ok(refreshCount >= 1);
  // PRD-120: a ativação não abre conexão nem roda a validação de setup.
  assert.deepStrictEqual(validateCalls, []);
});

test('setup validation: roda uma vez na primeira interação relevante (PRD-120)', async () => {
  const editor = {
    document: { fileName: '/ws/ut_pkg.pks', languageId: 'plsql' },
  };
  window.__triggerActiveTextEditorChange(editor as never);
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.deepStrictEqual(validateCalls, ['activation', 'install', 'apply']);

  // Memoizada por sessão: uma segunda interação não repete a conexão.
  window.__triggerActiveTextEditorChange(editor as never);
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.deepStrictEqual(validateCalls, ['activation', 'install', 'apply']);
});

test('perf: mudança de configuração reconstrói o probe (sucesso e paths inválidos)', async () => {
  // Cobre o sink de perf (sucesso, path inválido e falha de I/O) sem derrubar
  // a ativação. Cada mudança de config invalida o memo de setup (PRD-120 RF3),
  // então o refresh seguinte roda a validação mais uma vez.
  __setConfigValue('perf.reportFile', 'package.json/perf.jsonl');
  workspace.__triggerConfigChange({ affectsConfiguration: (s) => s === 'utplsql' });
  await tests.__getLastTestController()?.refreshHandler?.();
  await new Promise((resolve) => setTimeout(resolve, 10));

  __setConfigValue('perf.reportFile', '../fora.jsonl');
  workspace.__triggerConfigChange({ affectsConfiguration: (s) => s === 'utplsql' });
  await tests.__getLastTestController()?.refreshHandler?.();
  await new Promise((resolve) => setTimeout(resolve, 10));

  __setConfigValue('perf.reportFile', 'perf.txt');
  workspace.__triggerConfigChange({ affectsConfiguration: (s) => s === 'utplsql' });
  await tests.__getLastTestController()?.refreshHandler?.();
  await new Promise((resolve) => setTimeout(resolve, 10));
  __setConfigValue('perf.reportFile', '');
});

test('setup validation: falha não derruba a ativação', async () => {
  validateShouldThrow = true;
  const editor = {
    document: { fileName: '/ws/ut_pkg.pks', languageId: 'plsql' },
  };
  // Mudança de config invalida o memo (PRD-120 RF3) e a interação agenda a
  // validação; a rejeição é engolida e logada.
  workspace.__triggerConfigChange({ affectsConfiguration: (s) => s === 'utplsql' });
  window.__triggerActiveTextEditorChange(editor as never);
  await new Promise((resolve) => setTimeout(resolve, 10));
  validateShouldThrow = false;
  assert.ok(refreshCount >= 1);
});

test('resolveHandler: resolve por nível (schema/package/suite)', async () => {
  const controller = tests.__getLastTestController();
  assert.ok(controller);
  resolveCalls.length = 0;
  await controller.resolveHandler?.({ id: 'schema:APP' } as never);
  await controller.resolveHandler?.({ id: 'package:APP.UT_ORDERS' } as never);
  await controller.resolveHandler?.({ id: 'suite:APP.UT_ORDERS.UT_ORDERS' } as never);
  assert.deepStrictEqual(resolveCalls, [
    'schema:APP',
    'package:APP.UT_ORDERS',
    'suite:APP.UT_ORDERS.UT_ORDERS',
  ]);
});

test('handlers de ativação: refresh, configuração, editor e watcher', async () => {
  const controller = tests.__getLastTestController();
  assert.ok(controller);
  const before = refreshCount;

  await controller.resolveHandler?.(undefined);
  await controller.refreshHandler?.();
  assert.ok(refreshCount > before);

  workspace.__triggerConfigChange({ affectsConfiguration: () => false });
  workspace.__triggerConfigChange({ affectsConfiguration: (s) => s === 'utplsql' });
  workspace.__triggerConfigChange({
    affectsConfiguration: (s) => s === 'utplsql.discovery.languageIds',
  });
  window.__triggerActiveTextEditorChange(undefined);

  __setConfigValue('refreshDebounceMs', 0);
  workspace.__triggerWatcher('create');
  workspace.__triggerWatcher('change');
  workspace.__triggerWatcher('delete');
  await new Promise((resolve) => setTimeout(resolve, 10));
  assert.ok(refreshCount > before);
});

test('watcher: URI alterado/removido usa refreshUri/removeUri e rajada cai no full (PRD-103)', async () => {
  __setConfigValue('refreshDebounceMs', 0);
  const before = refreshCount;
  workspace.__triggerWatcher('change', { toString: () => '/ws/ut_a.pks' });
  workspace.__triggerWatcher('delete', { toString: () => '/ws/ut_b.pks' });
  await new Promise((resolve) => setTimeout(resolve, 20));
  assert.ok(refreshCount > before);

  // >8 URIs pendentes: o callback cancela os per-key e faz um full refresh.
  for (let i = 0; i < 10; i += 1) {
    workspace.__triggerWatcher('change', { toString: () => `/ws/ut_${i}.pks` });
  }
  await new Promise((resolve) => setTimeout(resolve, 30));
  assert.ok(refreshCount > before);
});

test('run profiles: Run e Run with Coverage delegam com a flag correta', async () => {
  const controller = tests.__getLastTestController();
  assert.ok(controller);
  assert.strictEqual(controller?.runProfiles.length, 2);

  const [runProfile, coverageProfile] = controller?.runProfiles ?? [];
  await (runProfile.runHandler as (r: unknown, t: unknown) => Promise<void>)(
    { include: [] },
    undefined,
  );
  await (coverageProfile.runHandler as (r: unknown, t: unknown) => Promise<void>)(
    { include: [] },
    undefined,
  );

  assert.strictEqual(runWithProgressCalls.length, 2);
  assert.strictEqual(runWithProgressCalls[0][2], false);
  assert.strictEqual(runWithProgressCalls[1][2], true);

  const details = await (
    coverageProfile.loadDetailedCoverage as (r: unknown, fc: unknown) => Promise<unknown>
  )({}, { uri: { toString: () => 'file:///x.pks' } });
  assert.deepStrictEqual(details, []);
});

test('deps: acessores de status bar e decorations são funcionais', () => {
  assert.ok(capturedDeps);
  assert.ok(capturedDeps.getStatusBar());
  const dm = capturedDeps.getDecorationManager() as {
    update: (m: Map<string, { status: string }>, resolve: (id: string) => unknown) => void;
    hasResults: () => boolean;
  };
  assert.ok(dm);
  const item = {
    range: new Range(0, 0, 0, 0),
    uri: { toString: () => 'file:///x.pks' },
  };
  dm.update(new Map([['test:x', { status: 'passed' }]]), (id) =>
    id === 'test:x' ? item : undefined,
  );
  assert.ok(dm.hasResults());

  // Editor ativo + resultados → reaplica as decorações (linhas 129-130).
  window.__triggerActiveTextEditorChange({
    document: { uri: { toString: () => 'file:///x.pks' } },
  } as never);
});

// PRD-50: wiring do auto-run ao salvar.
test('autoRun off (default): salvar .pks não executa', async () => {
  runUriCalls.length = 0;
  __setConfigValue('autoRun', 'off');
  workspace.__triggerSave({
    fileName: '/ws/ut_pkg.pks',
    uri: { fsPath: '/ws/ut_pkg.pks', toString: () => '/ws/ut_pkg.pks' },
  });
  await new Promise((resolve) => setTimeout(resolve, 20));
  assert.strictEqual(runUriCalls.length, 0);
});

test('autoRun onSave: salvar .pks agenda e executa após o delay', async () => {
  runUriCalls.length = 0;
  runIsRunning = false;
  __setConfigValue('autoRun', 'onSave');
  __setConfigValue('autoRunDelayMs', 0);
  workspace.__triggerSave({
    fileName: '/ws/ut_pkg.pks',
    uri: { fsPath: '/ws/ut_pkg.pks', toString: () => '/ws/ut_pkg.pks' },
  });
  await new Promise((resolve) => setTimeout(resolve, 20));
  assert.strictEqual(runUriCalls.length, 1);
  assert.strictEqual((runUriCalls[0][0] as { fsPath: string }).fsPath, '/ws/ut_pkg.pks');
});

test('autoRun onSave: saves rápidos do mesmo arquivo coalescem (clearTimeout)', async () => {
  runUriCalls.length = 0;
  runIsRunning = false;
  __setConfigValue('autoRun', 'onSave');
  __setConfigValue('autoRunDelayMs', 30);
  const doc = {
    fileName: '/ws/ut_pkg.pks',
    uri: { fsPath: '/ws/ut_pkg.pks', toString: () => '/ws/ut_pkg.pks' },
  };
  workspace.__triggerSave(doc);
  workspace.__triggerSave(doc);
  await new Promise((resolve) => setTimeout(resolve, 80));
  assert.strictEqual(runUriCalls.length, 1);
});

test('autoRun onSave: arquivo não-.pks é ignorado', async () => {
  runUriCalls.length = 0;
  __setConfigValue('autoRun', 'onSave');
  __setConfigValue('autoRunDelayMs', 0);
  workspace.__triggerSave({
    fileName: '/ws/notas.txt',
    uri: { fsPath: '/ws/notas.txt', toString: () => '/ws/notas.txt' },
  });
  workspace.__triggerSave({
    fileName: '/ws/ut_pkg.pkb',
    uri: { fsPath: '/ws/ut_pkg.pkb', toString: () => '/ws/ut_pkg.pkb' },
  });
  await new Promise((resolve) => setTimeout(resolve, 20));
  assert.strictEqual(runUriCalls.length, 0);
});

test('autoRun onSave: execução em andamento com queue=skip descarta', async () => {
  runUriCalls.length = 0;
  runIsRunning = true;
  __setConfigValue('autoRun', 'onSave');
  __setConfigValue('autoRunDelayMs', 0);
  __setConfigValue('autoRunQueue', 'skip');
  workspace.__triggerSave({
    fileName: '/ws/ut_pkg.pks',
    uri: { fsPath: '/ws/ut_pkg.pks', toString: () => '/ws/ut_pkg.pks' },
  });
  await new Promise((resolve) => setTimeout(resolve, 20));
  assert.strictEqual(runUriCalls.length, 0);
  runIsRunning = false;
});

test('autoRun onSave: cobertura segue o modo global (coverageAlways)', async () => {
  runUriCalls.length = 0;
  runIsRunning = false;
  __setConfigValue('autoRun', 'onSave');
  __setConfigValue('autoRunDelayMs', 0);
  workspace.__triggerSave({
    fileName: '/ws/ut_pkg.pks',
    uri: { fsPath: '/ws/ut_pkg.pks', toString: () => '/ws/ut_pkg.pks' },
  });
  await new Promise((resolve) => setTimeout(resolve, 20));
  assert.strictEqual(runUriCalls.length, 1);
  // Segundo argumento é a flag de cobertura (default false).
  assert.strictEqual(runUriCalls[0][1], false);
});

test('dispose: as subscriptions encerram o debouncer do watcher', () => {
  assert.ok(capturedContext);
  assert.doesNotThrow(() => {
    for (const d of capturedContext?.subscriptions ?? []) d.dispose?.();
  });
});

test('deactivate: cancela a execução e encerra sem lançar', async () => {
  const { deactivate } = await import('../../extension.js');
  await assert.doesNotReject(() => deactivate());
  assert.strictEqual(cancelCalls, 1);
});
