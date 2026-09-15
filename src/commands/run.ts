import * as vscode from 'vscode';
import { type CodeLensItem, parseCodeLensItems } from '../codelens';
import { refreshCompilationDiagnostics } from '../compilationDiagnostics';
import { getExtensionLocale } from '../config';
import { t } from '../i18n';
import { filterSuitesByFolder, filterSuitesByUri } from '../matching';
import { executeRun } from '../runner';
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

        progress.report({ message: 'Parseando resultados...' });
      },
    );
  };

  const runForUri = async (uri: vscode.Uri, coverage: boolean): Promise<void> => {
    const metas = collectAllItems(controller, state)
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
    const metas = collectAllItems(controller, state)
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

  context.subscriptions.push(
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
