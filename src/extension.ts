import * as vscode from 'vscode';
import { UtplsqlCodeLensProvider } from './codelens';
import { registerConnectionCommands } from './commands/connection';
import { registerDebug } from './commands/debug';
import type { CommandDeps } from './commands/deps';
import { registerProfileCommands } from './commands/profile';
import { registerRunCommands } from './commands/run';
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
import { closeOraclePool, invalidatePool } from './oracleRunner';
import { setupValidator, UtplsqlCodeActionProvider } from './quickfix';
import { TestStateManager } from './state';
import { UtplsqlStatusBar } from './statusBar';
import { createRefresher } from './testTree';

const state = new TestStateManager();
let statusBar: UtplsqlStatusBar | undefined;
let decorationManager: DecorationManager | undefined;
let cancelCurrentRun: (() => void) | undefined;

export function activate(context: vscode.ExtensionContext) {
  void vscode.commands.executeCommand('setContext', 'utplsql:activated', true);

  initSecretStorage(context.secrets);
  const profilesReady = (async () => {
    await migrateLegacyProfiles();
    await hydrateProfilePasswords();
  })();

  const controller = vscode.tests.createTestController('utplsql', 'utPLSQL');
  context.subscriptions.push(controller);

  const refresh = createRefresher(controller, state);
  controller.resolveHandler = async (item) => {
    if (!item) await refresh();
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
  registerDebug(context);

  context.subscriptions.push(
    vscode.languages.registerCodeLensProvider(
      { scheme: 'file', pattern: '**/*.pks' },
      new UtplsqlCodeLensProvider(),
    ),
  );

  statusBar = new UtplsqlStatusBar();
  context.subscriptions.push(statusBar);

  decorationManager = new DecorationManager();
  context.subscriptions.push(decorationManager);

  registerDbSourceProvider(context);
  registerCompilationDiagnostics(context);

  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((e) => {
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

  const watcher = vscode.workspace.createFileSystemWatcher('**/*.{pks,pkb}');
  const scheduleRefresh = createDebounced(
    () => void refresh(),
    () => readConfig().refreshDebounceMs,
  );
  watcher.onDidCreate(() => scheduleRefresh.schedule());
  watcher.onDidChange(() => scheduleRefresh.schedule());
  watcher.onDidDelete(() => scheduleRefresh.schedule());
  context.subscriptions.push(watcher, { dispose: () => scheduleRefresh.cancel() });

  void profilesReady.then(() => refresh());
}

export async function deactivate() {
  cancelCurrentRun?.();
  await closeOraclePool();
}
