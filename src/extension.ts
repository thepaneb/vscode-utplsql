import * as vscode from 'vscode';
import { createAutoRunner } from './autoRun';
import { UtplsqlCodeLensProvider } from './codelens';
import { registerConnectionCommands } from './commands/connection';
import { registerDebug } from './commands/debug';
import type { CommandDeps } from './commands/deps';
import { registerProfileCommands } from './commands/profile';
import { registerRunCommands } from './commands/run';
import { registerScaffoldCommands } from './commands/scaffold';
import { registerScriptCommands } from './commands/script';
import { registerUtilityCommands } from './commands/utility';
import { registerCompilationDiagnostics } from './compilationDiagnostics';
import { readConfig } from './config';
import {
  hydrateProfilePasswords,
  initSecretStorage,
  migrateLegacyProfiles,
} from './connectionProfiles';
import { registerDbSourceProvider } from './dbSourceProvider';
import { createDebounced } from './debounce';
import { DecorationManager } from './decorations';
import {
  buildLanguageSelector,
  buildWatcherGlob,
  currentLanguageContributions,
  workspaceAssociations,
} from './languageIdentity';
import { formatLogLine, setLogSink } from './logger';
import { closeOraclePool, invalidatePool } from './oracleRunner';
import { setupValidator, UtplsqlCodeActionProvider } from './quickfix';
import { TestStateManager } from './state';
import { UtplsqlStatusBar } from './statusBar';
import {
  createRefresher,
  resolvePackageNode,
  resolveSchemaNode,
  resolveSuiteNode,
} from './testTree';

const state = new TestStateManager();
let statusBar: UtplsqlStatusBar | undefined;
let decorationManager: DecorationManager | undefined;
let cancelCurrentRun: (() => void) | undefined;

export function activate(context: vscode.ExtensionContext) {
  void vscode.commands.executeCommand('setContext', 'utplsql:activated', true);

  // Snapshot do último resultado (PRD-56): `Memento` por setter e restore já
  // antes do primeiro refresh, para o label/duração sair certo na árvore.
  state.attachMemento(context.workspaceState);
  state.restore();

  // Log de diagnóstico em um LogOutputChannel (nível controlado pelo usuário).
  const log = vscode.window.createOutputChannel('utPLSQL', { log: true });
  context.subscriptions.push(log);
  setLogSink((level, msg, ctx) => log[level](formatLogLine(msg, ctx)));

  initSecretStorage(context.secrets);
  const profilesReady = (async () => {
    await migrateLegacyProfiles();
    await hydrateProfilePasswords();
  })();

  const controller = vscode.tests.createTestController('utplsql', 'utPLSQL');
  context.subscriptions.push(controller);

  const refresh = createRefresher(controller, state);
  controller.resolveHandler = async (item) => {
    if (!item) {
      await refresh();
      return;
    }
    // Resolução lazy por nível (PRD-75): schema → package → suite.
    if (item.id.startsWith('schema:')) await resolveSchemaNode(controller, state, item);
    else if (item.id.startsWith('package:')) resolvePackageNode(controller, state, item);
    else if (item.id.startsWith('suite:')) resolveSuiteNode(controller, state, item);
  };
  controller.refreshHandler = async () => {
    await refresh();
  };

  const deps: CommandDeps = {
    controller,
    state,
    getStatusBar: () => statusBar,
    getDecorationManager: () => decorationManager,
    refresh,
  };

  const run = registerRunCommands(context, deps);
  cancelCurrentRun = run.cancel;

  state.runProfile = controller.createRunProfile(
    'Run',
    vscode.TestRunProfileKind.Run,
    (request, token) => run.runWithProgress(request, token, false),
    true,
  );
  state.coverageProfile = controller.createRunProfile(
    'Run with Coverage',
    vscode.TestRunProfileKind.Coverage,
    (request, token) => run.runWithProgress(request, token, true),
    true,
  );
  state.coverageProfile.loadDetailedCoverage = async (_run, fc) =>
    state.getCoverage(fc.uri.toString());
  context.subscriptions.push(state.runProfile, state.coverageProfile);

  registerUtilityCommands(context, deps);
  registerConnectionCommands(context, deps);
  registerProfileCommands(context, deps);
  registerScriptCommands(context);
  registerScaffoldCommands(context);
  registerDebug(context, deps);

  const codeLensProvider = new UtplsqlCodeLensProvider();
  const buildCodeLensRegistration = (): vscode.Disposable => {
    const cfg = readConfig();
    return vscode.languages.registerCodeLensProvider(
      buildLanguageSelector(
        cfg.discoveryLanguageIds,
        currentLanguageContributions(),
        workspaceAssociations(),
      ),
      codeLensProvider,
    );
  };
  let codeLensRegistration = buildCodeLensRegistration();
  context.subscriptions.push({ dispose: () => codeLensRegistration.dispose() });

  statusBar = new UtplsqlStatusBar();
  context.subscriptions.push(statusBar);

  decorationManager = new DecorationManager();
  context.subscriptions.push(decorationManager);

  registerDbSourceProvider(context);
  registerCompilationDiagnostics(context);

  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (
        e.affectsConfiguration('utplsql.discovery.languageIds') ||
        e.affectsConfiguration('files.associations')
      ) {
        codeLensRegistration.dispose();
        codeLensRegistration = buildCodeLensRegistration();
      }
      if (!e.affectsConfiguration('utplsql')) return;
      invalidatePool();
    }),
  );

  context.subscriptions.push(setupValidator);

  const codeActionProvider = new UtplsqlCodeActionProvider();
  context.subscriptions.push(
    vscode.languages.registerCodeActionsProvider(
      { scheme: 'file', pattern: '**/*.pks' },
      codeActionProvider,
    ),
    vscode.languages.registerCodeActionsProvider({ scheme: 'utplsql-setup' }, codeActionProvider),
    vscode.languages.registerCodeActionsProvider(
      { scheme: 'utplsql-coverage' },
      codeActionProvider,
    ),
  );

  void (async () => {
    const [activationDiags, installDiags] = await Promise.all([
      setupValidator.validateOnActivation(),
      setupValidator.validateUtplsqlInstall(),
    ]);
    setupValidator.applyDiagnostics([...activationDiags, ...installDiags]);
  })();

  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor((editor) => {
      if (editor && decorationManager?.hasResults()) {
        decorationManager.applyToVisibleEditors();
      }
    }),
  );

  const watchCfg = readConfig();
  const watcher = vscode.workspace.createFileSystemWatcher(
    buildWatcherGlob(
      watchCfg.discoveryLanguageIds,
      currentLanguageContributions(),
      workspaceAssociations(),
    ),
  );
  const scheduleRefresh = createDebounced(
    () => void refresh(),
    () => readConfig().refreshDebounceMs,
  );
  watcher.onDidCreate(() => scheduleRefresh.schedule());
  watcher.onDidChange(() => scheduleRefresh.schedule());
  watcher.onDidDelete(() => scheduleRefresh.schedule());
  context.subscriptions.push(watcher, { dispose: () => scheduleRefresh.cancel() });

  // Auto-run on save (watch mode, PRD-50). Default `off`.
  const autoRunner = createAutoRunner(
    () => {
      const cfg = readConfig();
      return {
        enabled: cfg.autoRun === 'onSave',
        delayMs: cfg.autoRunDelayMs,
        queue: cfg.autoRunQueue,
      };
    },
    {
      run: async (uriStr) => {
        await run.runUri(vscode.Uri.file(uriStr), state.coverageAlways);
      },
      isRunning: () => run.isRunning(),
      isEligible: (uriStr) => /\.pks$/i.test(uriStr),
      setTimeout: (fn, ms) => setTimeout(fn, ms),
      clearTimeout: (handle) => clearTimeout(handle),
    },
  );
  context.subscriptions.push(
    vscode.workspace.onDidSaveTextDocument((doc) => {
      if (!doc.fileName.endsWith('.pks')) return;
      autoRunner.schedule(doc.uri.fsPath);
    }),
    { dispose: () => autoRunner.cancel() },
  );

  void profilesReady
    .then(() => refresh())
    .then(() => {
      // Restaura o último resultado (PRD-56 RF3): decorações inline, "Run Failed"
      // e o context key. Depende da árvore já montada (ids → itens).
      state.restoreLastFailed();
      void vscode.commands.executeCommand(
        'setContext',
        'utplsql:hasFailures',
        state.getLastFailedItems().length > 0,
      );
      decorationManager?.update(state.getLastResults(), (id) => state.getItem(id));
    });
}

export async function deactivate() {
  cancelCurrentRun?.();
  await closeOraclePool();
}
