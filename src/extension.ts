import * as path from 'node:path';
import * as vscode from 'vscode';
import { getCliInfo } from './cliInfo';
import { clearSessionConnection, readConfig } from './config';
import { discoverWorkspace } from './discovery';
import { executeRun } from './runner';
import { TestStateManager } from './state';

const state = new TestStateManager();
let currentRunToken: vscode.CancellationTokenSource | undefined;

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
    (request, token) => runWithProgress(controller, request, token, false, state),
    true,
  );
  state.coverageProfile = controller.createRunProfile(
    'Run with Coverage',
    vscode.TestRunProfileKind.Coverage,
    (request, token) => runWithProgress(controller, request, token, true, state),
    true,
  );
  state.coverageProfile.loadDetailedCoverage = async (_run, fc) =>
    state.getCoverage(fc.uri.toString());
  context.subscriptions.push(state.runProfile, state.coverageProfile);

  context.subscriptions.push(
    vscode.commands.registerCommand('utplsql.refresh', () => refresh(controller)),
    vscode.commands.registerCommand('utplsql.runAll', () =>
      runWithProgress(
        controller,
        new vscode.TestRunRequest(undefined, undefined, state.runProfile),
        undefined,
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
    vscode.commands.registerCommand('utplsql.cancelRun', () => {
      currentRunToken?.cancel();
    }),
    vscode.commands.registerCommand('utplsql.clearConnection', () => {
      clearSessionConnection();
      vscode.window.showInformationMessage('Conexão limpa da sessão.');
    }),
    vscode.commands.registerCommand('utplsql.showInfo', async () => {
      const cfg = readConfig();
      const info = await getCliInfo(cfg);
      if ('error' in info) {
        vscode.window.showErrorMessage(`utPLSQL info: ${info.error}`);
        return;
      }
      let msg = `CLI: ${info.cliVersion}\nAPI: ${info.apiVersion}`;
      if (info.dbVersion) msg += `\nDB:  ${info.dbVersion}`;
      const copy = await vscode.window.showInformationMessage(msg, 'Copiar');
      if (copy) vscode.env.clipboard.writeText(msg);
    }),
  );

  const watcher = vscode.workspace.createFileSystemWatcher('**/*.{pks,pkb}');
  watcher.onDidCreate(() => refresh(controller));
  watcher.onDidChange(() => refresh(controller));
  watcher.onDidDelete(() => refresh(controller));
  context.subscriptions.push(watcher);
  refresh(controller);
}

export function deactivate() {
  currentRunToken?.cancel();
}

async function runWithProgress(
  controller: vscode.TestController,
  request: vscode.TestRunRequest,
  externalToken: vscode.CancellationToken | undefined,
  coverage: boolean,
  state: TestStateManager,
): Promise<void> {
  currentRunToken?.cancel();

  const cts = new vscode.CancellationTokenSource();
  currentRunToken = cts;

  if (externalToken) {
    externalToken.onCancellationRequested(() => {
      try {
        cts.cancel();
      } catch {
        /* */
      }
    });
  }

  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: 'utPLSQL',
      cancellable: true,
    },
    async (progress, token) => {
      token.onCancellationRequested(() => {
        try {
          cts.cancel();
        } catch {
          /* */
        }
      });

      const items = request.include
        ? [...request.include]
        : (() => {
            const a: vscode.TestItem[] = [];
            controller.items.forEach((i) => {
              a.push(i);
            });
            return a;
          })();
      const total = items.filter((i) => state.getMeta(i)?.kind === 'suite').length;

      let done = 0;
      const onSuiteStart = () => {
        done++;
        progress.report({ message: `${done}/${total}` });
      };

      await executeRun(controller, request, cts.token, coverage, state, onSuiteStart);

      progress.report({ message: 'Parseando resultados...' });
    },
  );
}

async function refresh(controller: vscode.TestController): Promise<void> {
  const folders = vscode.workspace.workspaceFolders;
  const suites = await discoverWorkspace(readConfig().includePatterns, folders ?? undefined);
  controller.items.replace([]);
  state.cachedItems = [];
  for (const suite of suites) {
    const suiteItem = controller.createTestItem(
      `suite:${suite.packageName.toLowerCase()}`,
      `${suite.suiteDescription}  (${suite.packageName})`,
      suite.uri,
    );
    state.setMeta(suiteItem, {
      kind: 'suite',
      packageName: suite.packageName,
      uri: suite.uri,
      folder: suite.folder,
    });
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
        folder: suite.folder,
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
  await runWithProgress(
    controller,
    new vscode.TestRunRequest(
      include,
      undefined,
      coverage ? state.coverageProfile : state.runProfile,
    ),
    undefined,
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
  await runWithProgress(
    controller,
    new vscode.TestRunRequest(
      include,
      undefined,
      coverage ? state.coverageProfile : state.runProfile,
    ),
    undefined,
    coverage,
    state,
  );
}
