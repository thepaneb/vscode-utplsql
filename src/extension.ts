import * as path from 'node:path';
import * as vscode from 'vscode';
import { readConfig } from './config';
import { discoverWorkspace } from './discovery';
import { executeRun } from './runner';
import { TestStateManager } from './state';

const state = new TestStateManager();

export function activate(context: vscode.ExtensionContext) {
  const controller = vscode.tests.createTestController('utplsql', 'utPLSQL');
  context.subscriptions.push(controller);
  controller.resolveHandler = async (item) => {
    if (!item) await refresh(controller);
  };
  controller.refreshHandler = async () => {
    await refresh(controller);
  };

  state.runProfile = controller.createRunProfile(
    'Run',
    vscode.TestRunProfileKind.Run,
    (request, token) => executeRun(controller, request, token, false, state),
    true,
  );
  state.coverageProfile = controller.createRunProfile(
    'Run with Coverage',
    vscode.TestRunProfileKind.Coverage,
    (request, token) => executeRun(controller, request, token, true, state),
    true,
  );
  state.coverageProfile.loadDetailedCoverage = async (_run, fc) =>
    state.getCoverage(fc.uri.toString());
  context.subscriptions.push(state.runProfile, state.coverageProfile);

  context.subscriptions.push(
    vscode.commands.registerCommand('utplsql.refresh', () => refresh(controller)),
    vscode.commands.registerCommand('utplsql.runAll', () =>
      executeRun(
        controller,
        new vscode.TestRunRequest(undefined, undefined, state.runProfile),
        new vscode.CancellationTokenSource().token,
        false,
        state,
      ),
    ),
    vscode.commands.registerCommand('utplsql.runFile', (uri: vscode.Uri) =>
      runForUri(controller, uri, false),
    ),
    vscode.commands.registerCommand('utplsql.runFileCoverage', (uri: vscode.Uri) =>
      runForUri(controller, uri, true),
    ),
    vscode.commands.registerCommand('utplsql.runFolder', (uri: vscode.Uri) =>
      runForFolder(controller, uri, false),
    ),
    vscode.commands.registerCommand('utplsql.runFolderCoverage', (uri: vscode.Uri) =>
      runForFolder(controller, uri, true),
    ),
  );

  const watcher = vscode.workspace.createFileSystemWatcher('**/*.{pks,pkb}');
  watcher.onDidCreate(() => refresh(controller));
  watcher.onDidChange(() => refresh(controller));
  watcher.onDidDelete(() => refresh(controller));
  context.subscriptions.push(watcher);
  refresh(controller);
}

export function deactivate() {}

async function refresh(controller: vscode.TestController): Promise<void> {
  const suites = await discoverWorkspace(readConfig().includePatterns);
  controller.items.replace([]);
  state.cachedItems = [];
  for (const suite of suites) {
    const suiteItem = controller.createTestItem(
      `suite:${suite.packageName.toLowerCase()}`,
      `${suite.suiteDescription}  (${suite.packageName})`,
      suite.uri,
    );
    state.setMeta(suiteItem, { kind: 'suite', packageName: suite.packageName, uri: suite.uri });
    for (const t of suite.tests) {
      const testItem = controller.createTestItem(
        `test:${suite.packageName.toLowerCase()}.${t.procName.toLowerCase()}`,
        t.description,
        suite.uri,
      );
      testItem.range = new vscode.Range(t.line, 0, t.line, 0);
      state.setMeta(testItem, {
        kind: 'test',
        packageName: suite.packageName,
        procName: t.procName,
        description: t.description,
        uri: suite.uri,
      });
      suiteItem.children.add(testItem);
    }
    controller.items.add(suiteItem);
    state.cachedItems.push(suiteItem);
  }
}

function collectAllItems(controller: vscode.TestController): vscode.TestItem[] {
  if (state.cachedItems.length) return state.cachedItems;
  controller.items.forEach((i) => {
    state.cachedItems.push(i);
  });
  return state.cachedItems;
}

async function runForUri(controller: vscode.TestController, uri: vscode.Uri, coverage: boolean) {
  const base = path
    .basename(uri.fsPath)
    .replace(/\.(pks|pkb)$/i, '')
    .toLowerCase();
  const include = collectAllItems(controller).filter((i) => {
    const m = state.getMeta(i);
    return (
      m?.kind === 'suite' &&
      path
        .basename(m.uri.fsPath)
        .replace(/\.(pks|pkb)$/i, '')
        .toLowerCase() === base
    );
  });
  if (!include.length) {
    vscode.window.showWarningMessage('Nenhuma suite utPLSQL encontrada neste arquivo.');
    return;
  }
  await executeRun(
    controller,
    new vscode.TestRunRequest(
      include,
      undefined,
      coverage ? state.coverageProfile : state.runProfile,
    ),
    new vscode.CancellationTokenSource().token,
    coverage,
    state,
  );
}

async function runForFolder(controller: vscode.TestController, uri: vscode.Uri, coverage: boolean) {
  const folder = uri.fsPath.toLowerCase();
  const include = collectAllItems(controller).filter((i) => {
    const m = state.getMeta(i);
    return m?.kind === 'suite' && m.uri.fsPath.toLowerCase().startsWith(folder + path.sep);
  });
  if (!include.length) {
    vscode.window.showWarningMessage('Nenhuma suite utPLSQL encontrada nesta pasta.');
    return;
  }
  await executeRun(
    controller,
    new vscode.TestRunRequest(
      include,
      undefined,
      coverage ? state.coverageProfile : state.runProfile,
    ),
    new vscode.CancellationTokenSource().token,
    coverage,
    state,
  );
}
