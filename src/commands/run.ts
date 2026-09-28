import * as vscode from 'vscode';
import { type CodeLensItem, parseCodeLensItems } from '../codelens';
import { refreshCompilationDiagnostics } from '../compilationDiagnostics';
import { getExtensionLocale, readConfig, resolveConnection } from '../config';
import { t } from '../i18n';
import { filterSuitesByFolder, filterSuitesByUri } from '../matching';
import { listReportersForConnection } from '../oracleRunner';
import { collectRunTargets, executeRun } from '../runner';
import { collectAllItems } from '../testTree';
import type { ItemMeta } from '../types';
import type { CommandDeps } from './deps';

export interface RunCommands {
  runWithProgress(
    request: vscode.TestRunRequest,
    externalToken: vscode.CancellationToken | undefined,
    coverage: boolean,
  ): Promise<void>;
  cancel(): void;
}

export function registerRunCommands(
  context: vscode.ExtensionContext,
  deps: CommandDeps,
): RunCommands {
  const { controller, state } = deps;
  const locale = getExtensionLocale();
  let currentRunToken: vscode.CancellationTokenSource | undefined;

  const runWithProgress = async (
    request: vscode.TestRunRequest,
    externalToken: vscode.CancellationToken | undefined,
    coverage: boolean,
  ): Promise<void> => {
    currentRunToken?.cancel();

    const cts = new vscode.CancellationTokenSource();
    currentRunToken = cts;

    const externalSub = externalToken?.onCancellationRequested(() => {
      try {
        cts.cancel();
      } catch {
        /* */
      }
    });

    try {
      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: 'utPLSQL',
          cancellable: true,
        },
        async (progress, token) => {
          const progressSub = token.onCancellationRequested(() => {
            try {
              cts.cancel();
            } catch {
              /* */
            }
          });

          try {
            const items = request.include
              ? [...request.include]
              : (() => {
                  const a: vscode.TestItem[] = [];
                  controller.items.forEach((i) => {
                    a.push(i);
                  });
                  return a;
                })();
            const total = collectRunTargets(items, state).suiteCount;

            let done = 0;
            const onSuiteStart = () => {
              done++;
              progress.report({ message: `${done}/${total}` });
              deps.getStatusBar()?.showRunning(done, total);
            };

            const sb = deps.getStatusBar();
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

            // Diagnóstico de compilação PL/SQL pós-run (PRD-68 RF1).
            await refreshCompilationDiagnostics(state).catch(() => {});

            const dm = deps.getDecorationManager();
            if (dm) {
              dm.update(state.getLastResults(), (id) => state.getItem(id));
            }

            progress.report({ message: t(locale, 'ext.run.parsingResults') });
          } finally {
            progressSub.dispose();
          }
        },
      );
    } finally {
      externalSub?.dispose();
      if (currentRunToken === cts) currentRunToken = undefined;
      cts.dispose();
    }
  };

  const runForUri = async (uri: vscode.Uri, coverage: boolean): Promise<void> => {
    const metas = (await collectAllItems(controller, state))
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
      new vscode.TestRunRequest(
        include,
        undefined,
        coverage ? state.coverageProfile : state.runProfile,
      ),
      undefined,
      coverage,
    );
  };

  const runForFolder = async (uri: vscode.Uri, coverage: boolean): Promise<void> => {
    const metas = (await collectAllItems(controller, state))
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
      new vscode.TestRunRequest(
        include,
        undefined,
        coverage ? state.coverageProfile : state.runProfile,
      ),
      undefined,
      coverage,
    );
  };

  const findAnnotationAtLine = (
    document: vscode.TextDocument,
    cursorLine: number,
  ): CodeLensItem | undefined => {
    const items = parseCodeLensItems(document.getText());
    let best: CodeLensItem | undefined;
    for (const item of items) {
      if (item.line <= cursorLine && (!best || item.line > best.line)) {
        best = item;
      }
    }
    return best;
  };

  const runSingleTest = async (
    packageName: string,
    procName: string,
    coverage: boolean,
  ): Promise<void> => {
    const suiteItem = state.getSuiteItem(`suite:${packageName.toLowerCase()}`);
    if (!suiteItem) return;
    const testItems: vscode.TestItem[] = [];
    for (const [, c] of suiteItem.children) {
      testItems.push(c);
    }
    const testItem = testItems.find((c) => {
      const meta = state.getMeta(c);
      return meta?.kind === 'test' && meta.procName.toLowerCase() === procName.toLowerCase();
    });
    if (!testItem) return;
    await runWithProgress(
      new vscode.TestRunRequest(
        [testItem],
        undefined,
        coverage ? state.coverageProfile : state.runProfile,
      ),
      undefined,
      coverage,
    );
  };

  const findTestItem = (packageName: string, procName: string): vscode.TestItem | undefined => {
    const suiteItem = state.getSuiteItem(`suite:${packageName.toLowerCase()}`);
    if (!suiteItem) return undefined;
    let found: vscode.TestItem | undefined;
    suiteItem.children.forEach((c) => {
      const meta = state.getMeta(c);
      if (meta?.kind === 'test' && meta.procName.toLowerCase() === procName.toLowerCase()) {
        found = c;
      }
    });
    return found;
  };

  /** QuickPick de suítes descobertas (fallback quando não há cursor/alvo). */
  const pickSuiteItem = async (): Promise<vscode.TestItem[] | undefined> => {
    const suites = (await collectAllItems(controller, state)).filter(
      (i) => state.getMeta(i)?.kind === 'suite',
    );
    if (suites.length === 0) return undefined;
    const picked = await vscode.window.showQuickPick(
      suites.map((i) => ({
        label: (state.getMeta(i) as { packageName: string }).packageName,
        item: i,
      })),
    );
    return picked ? [picked.item] : undefined;
  };

  let exportChannel: vscode.OutputChannel | undefined;

  const deliverExport = async (
    reporter: string,
    text: string,
    dest: 'output' | 'file',
  ): Promise<void> => {
    if (dest === 'output') {
      exportChannel ??= vscode.window.createOutputChannel('utPLSQL reporter');
      exportChannel.clear();
      exportChannel.appendLine(`utPLSQL [${reporter}]`);
      exportChannel.append(text);
      exportChannel.show(true);
      return;
    }
    const xml = /junit|sonar|cobertura/.test(reporter);
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const folder = vscode.workspace.workspaceFolders?.[0];
    const fileName = `utplsql-${reporter}-${stamp}.${xml ? 'xml' : 'txt'}`;
    const target = await vscode.window.showSaveDialog({
      defaultUri: folder ? vscode.Uri.joinPath(folder.uri, fileName) : undefined,
      filters: xml ? { XML: ['xml'] } : { Text: ['txt'] },
    });
    if (!target) return;
    await vscode.workspace.fs.writeFile(target, Buffer.from(text, 'utf8'));
    vscode.window.showInformationMessage(
      t(locale, 'ext.export.saved', { reporter, path: target.fsPath }),
    );
  };

  /**
   * `utPLSQL: Run with Reporter (Export)` (PRD-76): resolve alvo → reporter →
   * destino → roda só com o reporter escolhido e grava a saída. Não altera os
   * resultados no Test Explorer.
   */
  const runExport = async (item?: vscode.TestItem): Promise<void> => {
    let include: vscode.TestItem[] | undefined;
    if (item) {
      include = [item];
    } else {
      const editor = vscode.window.activeTextEditor;
      if (editor?.document.fileName.endsWith('.pks')) {
        const annotation = findAnnotationAtLine(editor.document, editor.selection.active.line);
        if (annotation) {
          const target =
            annotation.type === 'test' && annotation.procName
              ? findTestItem(annotation.packageName, annotation.procName)
              : state.getSuiteItem(`suite:${annotation.packageName.toLowerCase()}`);
          if (target) include = [target];
        }
      }
      include ??= await pickSuiteItem();
    }
    if (!include?.length) {
      vscode.window.showWarningMessage(t(locale, 'ext.export.noTargets'));
      return;
    }

    const connection = await resolveConnection();
    if (!connection) {
      vscode.window.showErrorMessage(t(locale, 'ext.noConnection'));
      return;
    }
    const cfg = readConfig();
    const reporters = await listReportersForConnection(connection, cfg);
    const reporter = await vscode.window.showQuickPick(reporters, {
      placeHolder: t(locale, 'ext.export.reporterPlaceholder'),
    });
    if (!reporter) return;

    const dest = await vscode.window.showQuickPick([
      { label: t(locale, 'ext.export.toOutput'), value: 'output' as const },
      { label: t(locale, 'ext.export.toFile'), value: 'file' as const },
    ]);
    if (!dest) return;

    const cts = new vscode.CancellationTokenSource();
    currentRunToken = cts;
    try {
      const request = new vscode.TestRunRequest(include, undefined, state.runProfile);
      const text = await executeRun(
        controller,
        request,
        cts.token,
        false,
        state,
        undefined,
        undefined,
        {
          name: reporter,
          charset: cfg.reporterClientCharacterSet || undefined,
          colorConsole: cfg.reporterColorConsole || undefined,
        },
      );
      if (cts.token.isCancellationRequested || text === undefined) return;
      await deliverExport(reporter, text, dest.value);
    } catch (e) {
      vscode.window.showErrorMessage(
        t(locale, 'ext.export.failed', { error: e instanceof Error ? e.message : String(e) }),
      );
    } finally {
      if (currentRunToken === cts) currentRunToken = undefined;
      cts.dispose();
    }
  };

  context.subscriptions.push(
    vscode.commands.registerCommand('utplsql.runWithReporter', (item?: vscode.TestItem) =>
      runExport(item),
    ),
    vscode.commands.registerCommand('utplsql.runAll', () =>
      runWithProgress(
        new vscode.TestRunRequest(undefined, undefined, state.runProfile),
        undefined,
        false,
      ),
    ),
    vscode.commands.registerCommand('utplsql.runFile', (uri: vscode.Uri) => runForUri(uri, false)),
    vscode.commands.registerCommand('utplsql.runFileCoverage', (uri: vscode.Uri) =>
      runForUri(uri, true),
    ),
    vscode.commands.registerCommand('utplsql.runFolder', (uri: vscode.Uri) =>
      runForFolder(uri, false),
    ),
    vscode.commands.registerCommand('utplsql.runFolderCoverage', (uri: vscode.Uri) =>
      runForFolder(uri, true),
    ),
    vscode.commands.registerCommand('utplsql.cancelRun', () => {
      currentRunToken?.cancel();
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
          const testItem = testItems.find((c) => {
            const meta = state.getMeta(c);
            return meta?.kind === 'test' && meta.procName.toLowerCase() === procName.toLowerCase();
          });
          if (!testItem) return;
          await runWithProgress(
            new vscode.TestRunRequest(
              [testItem],
              undefined,
              args.coverage ? state.coverageProfile : state.runProfile,
            ),
            undefined,
            !!args.coverage,
          );
        } else {
          await runForUri(docUri, !!args.coverage);
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
          if (lr.uri) await runForUri(lr.uri, lr.coverage);
          break;
        case 'test':
          if (lr.procName && lr.packageName) {
            await runSingleTest(lr.packageName, lr.procName, lr.coverage);
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
        await runSingleTest(annotation.packageName, annotation.procName, false);
      } else {
        await runForUri(editor.document.uri, false);
      }
    }),
    vscode.commands.registerCommand('utplsql.runFailed', async () => {
      const failed = state.getLastFailedItems();
      if (failed.length === 0) {
        vscode.window.showInformationMessage(t(locale, 'ext.runFailed.none'));
        return;
      }
      await runWithProgress(
        new vscode.TestRunRequest(failed, undefined, state.runProfile),
        undefined,
        false,
      );
    }),
    vscode.commands.registerCommand('utplsql.showTestExplorer', () => {
      vscode.commands.executeCommand('workbench.view.testing');
    }),
  );

  return {
    runWithProgress,
    cancel: () => currentRunToken?.cancel(),
  };
}
