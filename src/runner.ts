import * as vscode from 'vscode';
import { getExtensionLocale, readConfig, resolveConnection } from './config';
import { t } from './i18n';
import { executeRunOracle, type OracleRunOptions } from './oracleRunner';
import type { TestStateManager } from './state';
import { applySqlCoverage } from './viewCoverage';

export { countResults, lastSegment, type RunResults } from './results';

export async function executeRun(
  controller: vscode.TestController,
  request: vscode.TestRunRequest,
  token: vscode.CancellationToken,
  coverage: boolean,
  state: TestStateManager,
  onSuiteStart?: () => void,
  onComplete?: (
    passed: number,
    failed: number,
    skipped: number,
    errored: number,
    durationMs: number,
  ) => void,
): Promise<void> {
  const folders = vscode.workspace.workspaceFolders;
  if (!folders?.length) {
    vscode.window.showErrorMessage(t(getExtensionLocale(), 'ext.openFolder'));
    return;
  }
  const connection = await resolveConnection();
  if (!connection) {
    vscode.window.showErrorMessage(t(getExtensionLocale(), 'ext.noConnection'));
    return;
  }

  const cfg = readConfig();
  const locale = getExtensionLocale();
  const root = folders[0].uri.fsPath;
  const run = controller.createTestRun(request);

  state.clearLastResults();

  if (request.include) {
    const items = [...request.include];
    if (items.length === 1) {
      const m = state.getMeta(items[0]);
      if (m?.kind === 'test') {
        state.setLastRun({
          type: 'test',
          uri: m.uri,
          packageName: m.packageName,
          procName: m.procName,
          coverage,
        });
      } else {
        state.setLastRun({ type: 'suite', uri: m?.uri, packageName: m?.packageName, coverage });
      }
    } else {
      const m = state.getMeta(items[0]);
      state.setLastRun({ type: 'file', uri: m?.uri, coverage });
    }
  } else {
    state.setLastRun({ type: 'all', coverage });
  }

  vscode.commands.executeCommand('setContext', 'utplsql:running', true);

  const leafTests: vscode.TestItem[] = [];
  const pathArgs = new Set<string>();

  const included: vscode.TestItem[] = [];
  if (request.include) {
    request.include.forEach((i) => {
      included.push(i);
    });
  } else {
    controller.items.forEach((i) => {
      included.push(i);
    });
  }

  for (const item of included) {
    const m = state.getMeta(item);
    if (!m) continue;
    if (m.kind === 'suite') {
      onSuiteStart?.();
      pathArgs.add(m.packageName);
      item.children.forEach((c) => {
        leafTests.push(c);
      });
    } else {
      pathArgs.add(`${m.packageName}.${m.procName}`);
      leafTests.push(item);
    }
  }

  for (const item of leafTests) {
    run.enqueued(item);
  }
  for (const item of leafTests) run.started(item);

  run.appendOutput(
    `${t(locale, 'runner.running', { coverage: coverage ? t(locale, 'runner.withCoverage') : '' })}\r\n`,
  );

  try {
    const oracleOpts: OracleRunOptions = {
      connection,
      pathArgs: [...pathArgs],
      coverage,
      sourcePath: cfg.sourcePath,
      root,
      run,
      leafTests,
      state,
      onComplete,
      folders,
      additionalReporters: cfg.additionalReporters,
      coverageOwner: cfg.coverageOwner,
      dbmsOutput: cfg.dbmsOutput,
      timeoutMinutes: cfg.timeoutMinutes,
    };
    await executeRunOracle(oracleOpts, token);
    if (cfg.sqlCoverageEnabled) {
      await applySqlCoverage({
        connection,
        root,
        sourcePath: cfg.sourcePath,
        run,
        state,
        folders,
      });
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    run.appendOutput(`\r\n${t(locale, 'runner.oracleErrorHeader', { error: msg })}\r\n`);
    for (const item of leafTests) {
      run.errored(item, new vscode.TestMessage(t(locale, 'runner.oracleError', { error: msg })));
    }
  }

  run.end();
  vscode.commands.executeCommand('setContext', 'utplsql:running', false);
}
