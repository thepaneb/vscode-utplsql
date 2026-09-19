import * as vscode from 'vscode';
import { getExtensionLocale, readConfig, resolveConnection } from './config';
import { t } from './i18n';
import { executeRunOracle, type OracleRunOptions } from './oracleRunner';
import type { LastRunState, TestStateManager } from './state';
import type { ItemMeta } from './types';
import { applySqlCoverage } from './viewCoverage';

export { countResults, lastSegment, type RunResults } from './results';

export interface RunTargets {
  /** Test items folha (kind 'test') a executar, sem duplicatas. */
  leafTests: vscode.TestItem[];
  /** Paths para `ut_runner.run` (`PKG` para suites, `PKG.PROC` para testes). */
  pathArgs: Set<string>;
  /** Número de suites alcançadas (para o progresso). */
  suiteCount: number;
}

/**
 * Expande os itens selecionados em alvos de execução. Nós sem meta
 * (`schema:`/`package:` no modo schema) são percorridos recursivamente até
 * chegar em suites/testes. Essencial para Run All e run de Schema/Package —
 * antes esses nós eram ignorados e a execução rodava sem filtro de path.
 */
export function collectRunTargets(
  roots: Iterable<vscode.TestItem>,
  state: TestStateManager,
): RunTargets {
  const leafTests: vscode.TestItem[] = [];
  const seen = new Set<string>();
  const pathArgs = new Set<string>();
  let suiteCount = 0;

  const visit = (item: vscode.TestItem, insideSuite: boolean): void => {
    const m = state.getMeta(item);
    if (m?.kind === 'test') {
      if (!seen.has(item.id)) {
        seen.add(item.id);
        leafTests.push(item);
      }
      if (!insideSuite) pathArgs.add(`${m.packageName}.${m.procName}`);
      return;
    }
    if (m?.kind === 'suite') {
      suiteCount++;
      pathArgs.add(m.packageName);
      item.children.forEach((c) => {
        visit(c, true);
      });
      return;
    }
    item.children.forEach((c) => {
      visit(c, false);
    });
  };

  for (const root of roots) visit(root, false);
  return { leafTests, pathArgs, suiteCount };
}

/**
 * Deriva o `lastRun` (para o smart re-run) a partir dos itens selecionados,
 * descendo em nós sem meta. Um container (schema/package) com uma única suite
 * vira `suite`; com várias vira `file`; nenhum alvo vira `all`.
 */
export function deriveLastRun(
  roots: Iterable<vscode.TestItem>,
  hasInclude: boolean,
  coverage: boolean,
  state: TestStateManager,
): LastRunState {
  if (!hasInclude) return { type: 'all', coverage };

  const metas: ItemMeta[] = [];
  const visit = (item: vscode.TestItem): void => {
    const m = state.getMeta(item);
    if (m) {
      metas.push(m);
      return;
    }
    item.children.forEach((c) => {
      visit(c);
    });
  };
  for (const root of roots) visit(root);

  const tests = metas.filter((m) => m.kind === 'test');
  const suites = metas.filter((m) => m.kind === 'suite');
  if (tests.length === 1 && suites.length === 0) {
    const t = tests[0];
    return {
      type: 'test',
      uri: t.uri,
      packageName: t.packageName,
      procName: t.procName,
      coverage,
    };
  }
  if (suites.length === 1 && tests.length === 0) {
    return { type: 'suite', uri: suites[0].uri, packageName: suites[0].packageName, coverage };
  }
  if (tests.length === 0 && suites.length === 0) return { type: 'all', coverage };
  const first = suites[0] ?? tests[0];
  return { type: 'file', uri: first.uri, coverage };
}

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

  void vscode.commands.executeCommand('setContext', 'utplsql:running', true);

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

  const { leafTests, pathArgs, suiteCount } = collectRunTargets(included, state);
  state.setLastRun(deriveLastRun(included, !!request.include, coverage, state));
  for (let i = 0; i < suiteCount; i++) onSuiteStart?.();

  if (leafTests.length === 0) {
    run.appendOutput(`\r\n${t(locale, 'runner.noTests')}\r\n`);
    run.end();
    void vscode.commands.executeCommand('setContext', 'utplsql:running', false);
    return;
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
  void vscode.commands.executeCommand('setContext', 'utplsql:running', false);
}
