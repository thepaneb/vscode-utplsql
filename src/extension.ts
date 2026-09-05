import * as vscode from 'vscode';
import { getCliInfo } from './cliInfo';
import { listReporters } from './cliReporters';
import { type CodeLensItem, parseCodeLensItems, UtplsqlCodeLensProvider } from './codelens';
import { compilationDiagnostics } from './compilationDiagnostics';
import {
  clearSessionConnection,
  getExtensionLocale,
  readConfig,
  resolveConnection,
  resolveConnectionNoPrompt,
} from './config';
import {
  generateId,
  getAllProfiles,
  importFromSqlDeveloper,
  saveProfiles,
  selectProfile,
  setActiveProfile,
} from './connectionProfiles';
import {
  startDebugSession,
  UtplsqlDebugAdapterDescriptorFactory,
  UtplsqlDebugConfigurationProvider,
} from './debugger';
import { DecorationManager } from './decorations';
import {
  discoverSchemaFromDb,
  discoverSchemasFromFolders,
  discoverWorkspace,
  extractSchemaFromPath,
  type SuiteFile,
} from './discovery';
import { t } from './i18n';
import { filterSuitesByFolder, filterSuitesByUri } from './matching';
import { closeOraclePool } from './oracleRunner';
import { setupValidator, UtplsqlCodeActionProvider } from './quickfix';
import { executeRun } from './runner';
import { TestStateManager } from './state';
import { UtplsqlStatusBar } from './statusBar';
import type { ConnectionProfile, ItemMeta } from './types';

const state = new TestStateManager();
let currentRunToken: vscode.CancellationTokenSource | undefined;
let refreshPromise: Promise<void> | undefined;
let needsRefresh = false;
let statusBar: UtplsqlStatusBar | undefined;
let decorationManager: DecorationManager | undefined;

export function activate(context: vscode.ExtensionContext) {
  const locale = getExtensionLocale();
  vscode.commands.executeCommand('setContext', 'utplsql:activated', true);

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
    vscode.commands.registerCommand('utplsql.selectReporter', async () => {
      const conn = await resolveConnection();
      if (!conn) return;
      const cfg = readConfig();
      const reporters = await listReporters(cfg, conn);
      if ('error' in reporters) {
        vscode.window.showErrorMessage(
          t(locale, 'ext.reporters.listFailed', { error: reporters.error }),
        );
        return;
      }
      const selected = await vscode.window.showQuickPick(reporters, {
        placeHolder: t(locale, 'ext.reporters.placeholder'),
      });
      if (selected) {
        state.setExtraReporter(selected);
        vscode.window.showInformationMessage(
          t(locale, 'ext.reporters.willUse', { name: selected }),
        );
      }
    }),
    vscode.commands.registerCommand('utplsql.clearConnection', () => {
      clearSessionConnection();
      vscode.window.showInformationMessage(t(locale, 'ext.connection.cleared'));
    }),
    vscode.commands.registerCommand('utplsql.showInfo', async () => {
      const cfg = readConfig();
      const info = await getCliInfo(cfg);
      if ('error' in info) {
        vscode.window.showErrorMessage(t(locale, 'ext.info.failed', { error: info.error }));
        return;
      }
      let msg = `CLI: ${info.cliVersion}\nAPI: ${info.apiVersion}`;
      if (info.dbVersion) msg += `\nDB:  ${info.dbVersion}`;
      const copy = await vscode.window.showInformationMessage(msg, t(locale, 'common.copy'));
      if (copy) vscode.env.clipboard.writeText(msg);
    }),
    vscode.commands.registerCommand(
      'utplsql.runLens',
      async (args: {
        type: 'suite' | 'test';
        packageName: string;
        procName?: string;
        uri: string;
        coverage?: boolean;
      }) => {
        const docUri = vscode.Uri.parse(args.uri);
        if (args.type === 'test' && args.procName) {
          const procName = args.procName;
          const suiteItem = state.getSuiteItem(`suite:${args.packageName.toLowerCase()}`);
          if (!suiteItem) return;
          const testItems: vscode.TestItem[] = [];
          for (const [, c] of suiteItem.children) {
            testItems.push(c);
          }
          const testItem = testItems.find((t) => {
            const meta = state.getMeta(t);
            return meta?.kind === 'test' && meta.procName.toLowerCase() === procName.toLowerCase();
          });
          if (!testItem) return;
          await runWithProgress(
            controller,
            new vscode.TestRunRequest(
              [testItem],
              undefined,
              args.coverage ? state.coverageProfile : state.runProfile,
            ),
            undefined,
            !!args.coverage,
            state,
          );
        } else {
          await runForUri(controller, docUri, !!args.coverage);
        }
      },
    ),
    vscode.commands.registerCommand('utplsql.rerunLast', async () => {
      const lr = state.getLastRun();
      if (!lr) {
        vscode.window.showInformationMessage(t(locale, 'ext.noPreviousRun'));
        return;
      }
      switch (lr.type) {
        case 'all':
          await vscode.commands.executeCommand('utplsql.runAll');
          break;
        case 'file':
        case 'suite':
          if (lr.uri) await runForUri(controller, lr.uri, lr.coverage);
          break;
        case 'test':
          if (lr.uri && lr.procName && lr.packageName) {
            await runSingleTest(controller, lr.uri, lr.packageName, lr.procName, lr.coverage);
          }
          break;
      }
    }),
    vscode.commands.registerCommand('utplsql.runAtCursor', async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor?.document.fileName.endsWith('.pks')) {
        vscode.window.showWarningMessage(t(locale, 'ext.runAtCursor.onlyPks'));
        return;
      }
      const annotation = findAnnotationAtLine(editor.document, editor.selection.active.line);
      if (!annotation) {
        vscode.window.showWarningMessage(t(locale, 'ext.runAtCursor.noAnnotation'));
        return;
      }
      if (annotation.type === 'test' && annotation.procName) {
        await runSingleTest(
          controller,
          editor.document.uri,
          annotation.packageName,
          annotation.procName,
          false,
        );
      } else {
        await runForUri(controller, editor.document.uri, false);
      }
    }),
    vscode.commands.registerCommand('utplsql.runFailed', async () => {
      const failed = state.getLastFailedItems();
      if (failed.length === 0) {
        vscode.window.showInformationMessage(t(locale, 'ext.runFailed.none'));
        return;
      }
      await runWithProgress(
        controller,
        new vscode.TestRunRequest(failed, undefined, state.runProfile),
        undefined,
        false,
        state,
      );
    }),
  );

  const lensProvider = new UtplsqlCodeLensProvider();
  context.subscriptions.push(
    vscode.languages.registerCodeLensProvider(
      { scheme: 'file', pattern: '**/*.pks' },
      lensProvider,
    ),
  );

  statusBar = new UtplsqlStatusBar();
  context.subscriptions.push(statusBar);

  context.subscriptions.push(
    vscode.commands.registerCommand('utplsql.showTestExplorer', () => {
      vscode.commands.executeCommand('workbench.view.testing');
    }),
  );

  decorationManager = new DecorationManager();
  context.subscriptions.push(decorationManager);

  context.subscriptions.push(compilationDiagnostics);

  context.subscriptions.push(setupValidator);

  context.subscriptions.push(
    vscode.debug.registerDebugAdapterDescriptorFactory(
      'utplsql',
      new UtplsqlDebugAdapterDescriptorFactory(),
    ),
    vscode.debug.registerDebugConfigurationProvider(
      'utplsql',
      new UtplsqlDebugConfigurationProvider(),
    ),
  );

  const codeActionProvider = vscode.languages.registerCodeActionsProvider(
    { scheme: 'file', pattern: '**/*.pks' },
    new UtplsqlCodeActionProvider(),
  );
  context.subscriptions.push(codeActionProvider);
  context.subscriptions.push(
    vscode.languages.registerCodeActionsProvider(
      { scheme: 'utplsql-setup' },
      new UtplsqlCodeActionProvider(),
    ),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('utplsql.configureConnection', async () => {
      await vscode.commands.executeCommand('workbench.action.openSettings', 'utplsql.connection');
    }),
    vscode.commands.registerCommand('utplsql.copyGrantsToClipboard', () => {
      const grants = [
        'GRANT EXECUTE ON SYS.DBMS_PROFILER TO <your_schema>;',
        'GRANT EXECUTE ON SYS.DBMS_PLSQL_CODE_COVERAGE TO <your_schema>;',
      ].join('\n');
      vscode.env.clipboard.writeText(grants);
      vscode.window.showInformationMessage(t(locale, 'ext.grants.copied'));
    }),
    vscode.commands.registerCommand('utplsql.validateSetup', async () => {
      const [activationDiags, installDiags] = await Promise.all([
        setupValidator.validateOnActivation(),
        setupValidator.validateUtplsqlInstall(),
      ]);
      const diags = [...activationDiags, ...installDiags];
      setupValidator.applyDiagnostics(diags);
      vscode.window.showInformationMessage(
        diags.length === 0
          ? t(locale, 'ext.validate.ok')
          : t(locale, 'ext.validate.problems', { count: diags.length }),
      );
    }),
    vscode.commands.registerCommand('utplsql.recompileUt3', () => setupValidator.recompileUt3()),
    vscode.commands.registerCommand('utplsql.debugTest', async () => {
      if (!readConfig().debuggerEnabled) {
        vscode.window.showInformationMessage(t(locale, 'ext.debug.disabled'));
        return;
      }
      const editor = vscode.window.activeTextEditor;
      const file = editor?.document.fileName ?? '';
      const base = file.split(/[\\/]/).pop() ?? '';
      const packageName = base.replace(/\.(pks|pkb|sql)$/i, '');
      if (!packageName) {
        vscode.window.showWarningMessage(t(locale, 'ext.debug.openPks'));
        return;
      }
      await startDebugSession(packageName);
    }),
    vscode.commands.registerCommand('utplsql.switchProfile', async () => {
      const profiles = getAllProfiles();
      if (profiles.length === 0) {
        vscode.window.showInformationMessage(t(locale, 'ext.profile.none'));
        return;
      }
      const selected = await selectProfile(profiles);
      if (!selected) return;
      await setActiveProfile(selected.id);
      statusBar?.showIdle();
      vscode.window.showInformationMessage(
        t(locale, 'ext.profile.active', { name: selected.name }),
      );
    }),
    vscode.commands.registerCommand('utplsql.manageProfiles', async () => {
      await vscode.commands.executeCommand('workbench.action.openSettings', 'utplsql.profiles');
    }),
    vscode.commands.registerCommand('utplsql.importSqlDevConnections', async () => {
      const imported = await importFromSqlDeveloper();
      if (imported.length === 0) {
        vscode.window.showWarningMessage(t(locale, 'ext.sqlDev.import.none'));
        return;
      }
      const merged = [...getAllProfiles(), ...imported];
      await saveProfiles(merged);
      vscode.window.showInformationMessage(
        t(locale, 'ext.sqlDev.import.ok', { count: imported.length }),
      );
    }),
    vscode.commands.registerCommand('utplsql.newProfile', async () => {
      const name = await vscode.window.showInputBox({
        title: t(locale, 'ext.profile.new.title'),
        prompt: t(locale, 'ext.profile.new.namePrompt'),
        placeHolder: t(locale, 'ext.profile.new.namePlaceholder'),
      });
      if (!name?.trim()) return;
      const connection = await vscode.window.showInputBox({
        title: t(locale, 'ext.profile.new.title'),
        prompt: t(locale, 'ext.profile.new.connPrompt'),
        password: true,
      });
      if (!connection?.trim()) return;
      const sourcePath = await vscode.window.showInputBox({
        title: t(locale, 'ext.profile.new.title'),
        prompt: t(locale, 'ext.profile.new.sourcePrompt'),
        placeHolder: t(locale, 'ext.profile.new.sourcePlaceholder'),
      });
      const profile: ConnectionProfile = {
        id: generateId(),
        name: name.trim(),
        connection: connection.trim(),
      };
      if (sourcePath?.trim()) profile.sourcePath = sourcePath.trim();
      const profiles = getAllProfiles();
      await saveProfiles([...profiles, profile]);
      await setActiveProfile(profile.id);
      statusBar?.showIdle();
      vscode.window.showInformationMessage(
        t(locale, 'ext.profile.new.created', { name: profile.name }),
      );
    }),
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
  watcher.onDidCreate(() => refresh(controller));
  watcher.onDidChange(() => refresh(controller));
  watcher.onDidDelete(() => refresh(controller));
  context.subscriptions.push(watcher);
  refresh(controller);
}

export async function deactivate() {
  currentRunToken?.cancel();
  await closeOraclePool();
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
        statusBar?.showRunning(done, total);
      };

      const sb = statusBar;
      await executeRun(
        controller,
        request,
        cts.token,
        coverage,
        state,
        onSuiteStart,
        sb
          ? (passed, failed, skipped, errored, durationMs) =>
              sb.showResults(passed, failed, skipped, errored, durationMs)
          : undefined,
      );

      if (decorationManager) {
        decorationManager.update(state.getLastResults(), controller);
      }

      progress.report({ message: 'Parseando resultados...' });
    },
  );
}

async function refresh(controller: vscode.TestController): Promise<void> {
  if (refreshPromise) {
    needsRefresh = true;
    await refreshPromise;
    if (needsRefresh) {
      needsRefresh = false;
      return refresh(controller);
    }
    return;
  }

  refreshPromise = doRefresh(controller);
  try {
    await refreshPromise;
  } finally {
    refreshPromise = undefined;
  }
}

async function doRefresh(controller: vscode.TestController): Promise<void> {
  const folders = vscode.workspace.workspaceFolders;
  const cfg = readConfig();
  const suites = await discoverWorkspace(cfg.includePatterns, folders ?? undefined);
  controller.items.replace([]);
  state.cachedItems = [];
  state.clearSuiteMap();

  if (cfg.organization === 'schema' && folders?.length) {
    if (cfg.runnerMode !== 'cli') {
      await mergeDbSuites(suites, folders, cfg.organizationSchemaPattern);
    }
    buildSchemaTree(controller, suites, cfg.organizationSchemaPattern);
  } else {
    buildFileTree(controller, suites);
  }
}

async function mergeDbSuites(
  suites: SuiteFile[],
  folders: readonly vscode.WorkspaceFolder[],
  schemaPattern: string,
): Promise<void> {
  const connStr = resolveConnectionNoPrompt();
  if (!connStr) return;

  const schemas = new Set<string>();
  for (const suite of suites) {
    const schema = extractSchemaFromPath(suite.uri.fsPath, suite.folder.uri.fsPath, schemaPattern);
    if (schema) schemas.add(schema);
  }
  for (const schema of await discoverSchemasFromFolders(folders, schemaPattern)) {
    schemas.add(schema);
  }

  for (const schema of schemas) {
    const dbSuites = await discoverSchemaFromDb(connStr, schema, folders);
    for (const dbSuite of dbSuites) {
      const exists = suites.some(
        (fs) => fs.packageName.toLowerCase() === dbSuite.packageName.toLowerCase(),
      );
      if (!exists) {
        suites.push(dbSuite);
      }
    }
  }
}

function buildFileTree(
  controller: vscode.TestController,
  suites: Awaited<ReturnType<typeof discoverWorkspace>>,
) {
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
    suiteItem.range = new vscode.Range(suite.suiteLine, 0, suite.suiteLine, 0);
    for (const t of suite.tests) {
      const testItem = controller.createTestItem(
        `test:${suite.packageName.toLowerCase()}.${t.procName.toLowerCase()}`,
        t.displayName ?? t.description,
        suite.uri,
      );
      testItem.range = new vscode.Range(t.line, 0, t.line, 0);
      state.setMeta(testItem, {
        kind: 'test',
        packageName: suite.packageName,
        procName: t.procName,
        description: t.displayName ?? t.description,
        uri: suite.uri,
        folder: suite.folder,
      });
      suiteItem.children.add(testItem);
    }
    controller.items.add(suiteItem);
    state.cachedItems.push(suiteItem);
    state.setSuiteItem(`suite:${suite.packageName.toLowerCase()}`, suiteItem);
  }
}

function buildSchemaTree(
  controller: vscode.TestController,
  suites: Awaited<ReturnType<typeof discoverWorkspace>>,
  schemaPattern: string,
) {
  const bySchema = new Map<string, typeof suites>();

  for (const suite of suites) {
    const schema =
      suite.dbSchema ??
      extractSchemaFromPath(suite.uri.fsPath, suite.folder.uri.fsPath, schemaPattern);
    const key = schema ?? 'UNKNOWN';
    if (!bySchema.has(key)) bySchema.set(key, []);
    bySchema.get(key)?.push(suite);
  }

  const sortedSchemas = [...bySchema.keys()].sort((a, b) => {
    if (a === 'UNKNOWN') return 1;
    if (b === 'UNKNOWN') return -1;
    return a.localeCompare(b);
  });

  for (const schema of sortedSchemas) {
    const schemaSuites = bySchema.get(schema);
    if (!schemaSuites) continue;
    const firstSuite = schemaSuites[0];
    const schemaItem = controller.createTestItem(
      `schema:${schema}`,
      `Schema: ${schema}`,
      firstSuite.folder.uri,
    );

    const byPackage = new Map<string, typeof suites>();
    for (const suite of schemaSuites) {
      const pkg = suite.packageName;
      if (!byPackage.has(pkg)) byPackage.set(pkg, []);
      byPackage.get(pkg)?.push(suite);
    }

    for (const [pkg, pkgSuites] of byPackage) {
      const pkgItem = controller.createTestItem(
        `package:${schema}:${pkg}`,
        `Package: ${pkg}`,
        pkgSuites[0].uri,
      );

      for (const suite of pkgSuites) {
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
        suiteItem.range = new vscode.Range(suite.suiteLine, 0, suite.suiteLine, 0);
        for (const t of suite.tests) {
          const testItem = controller.createTestItem(
            `test:${suite.packageName.toLowerCase()}.${t.procName.toLowerCase()}`,
            t.displayName ?? t.description,
            suite.uri,
          );
          testItem.range = new vscode.Range(t.line, 0, t.line, 0);
          state.setMeta(testItem, {
            kind: 'test',
            packageName: suite.packageName,
            procName: t.procName,
            description: t.displayName ?? t.description,
            uri: suite.uri,
            folder: suite.folder,
          });
          suiteItem.children.add(testItem);
        }
        pkgItem.children.add(suiteItem);
        state.cachedItems.push(suiteItem);
        state.setSuiteItem(`suite:${suite.packageName.toLowerCase()}`, suiteItem);
      }
      schemaItem.children.add(pkgItem);
    }
    controller.items.add(schemaItem);
  }
}

function collectAllItems(controller: vscode.TestController): vscode.TestItem[] {
  if (state.cachedItems.length) return state.cachedItems;
  controller.items.forEach((i) => {
    state.cachedItems.push(i);
    for (const [, c] of i.children) {
      state.cachedItems.push(c);
      for (const [, gc] of c.children) {
        state.cachedItems.push(gc);
      }
    }
  });
  return state.cachedItems;
}

async function runForUri(controller: vscode.TestController, uri: vscode.Uri, coverage: boolean) {
  const locale = getExtensionLocale();
  const metas = collectAllItems(controller)
    .map((i) => state.getMeta(i))
    .filter(Boolean) as ItemMeta[];
  const include = filterSuitesByUri(metas, uri.fsPath)
    .map((m) => state.getSuiteItem(`suite:${m.packageName.toLowerCase()}`))
    .filter(Boolean) as vscode.TestItem[];
  if (!include.length) {
    vscode.window.showWarningMessage(t(locale, 'ext.noSuiteInFile'));
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
  const locale = getExtensionLocale();
  const metas = collectAllItems(controller)
    .map((i) => state.getMeta(i))
    .filter(Boolean) as ItemMeta[];
  const include = filterSuitesByFolder(metas, uri.fsPath)
    .map((m) => state.getSuiteItem(`suite:${m.packageName.toLowerCase()}`))
    .filter(Boolean) as vscode.TestItem[];
  if (!include.length) {
    vscode.window.showWarningMessage(t(locale, 'ext.noSuiteInFolder'));
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

function findAnnotationAtLine(
  document: vscode.TextDocument,
  cursorLine: number,
): CodeLensItem | undefined {
  const items = parseCodeLensItems(document.getText());
  let best: CodeLensItem | undefined;
  for (const item of items) {
    if (item.line <= cursorLine && (!best || item.line > best.line)) {
      best = item;
    }
  }
  return best;
}

async function runSingleTest(
  controller: vscode.TestController,
  _uri: vscode.Uri,
  packageName: string,
  procName: string,
  coverage: boolean,
): Promise<void> {
  const suiteItem = state.getSuiteItem(`suite:${packageName.toLowerCase()}`);
  if (!suiteItem) return;
  const testItems: vscode.TestItem[] = [];
  for (const [, c] of suiteItem.children) {
    testItems.push(c);
  }
  const testItem = testItems.find((t) => {
    const meta = state.getMeta(t);
    return meta?.kind === 'test' && meta.procName.toLowerCase() === procName.toLowerCase();
  });
  if (!testItem) return;
  await runWithProgress(
    controller,
    new vscode.TestRunRequest(
      [testItem],
      undefined,
      coverage ? state.coverageProfile : state.runProfile,
    ),
    undefined,
    coverage,
    state,
  );
}
