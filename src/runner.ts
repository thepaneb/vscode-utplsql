import * as vscode from 'vscode';
import { getExtensionLocale, readConfig, resolveConnection } from './config';
import { offerCoverageHtmlReport } from './coverage';
import { formatUserError } from './errors';
import { t } from './i18n';
import { logger } from './logger';
import { resolveRunRoots } from './matching';
import {
  beginOracleActivity,
  executeRunOracle,
  type OracleRunOptions,
  RunAbortedError,
} from './oracleRunner';
import { setupValidator } from './quickfix';
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
  /** Export com reporter arbitrário (PRD-76): devolve a saída textual. */
  exportReporter?: { name: string; charset?: string; colorConsole?: boolean },
): Promise<string | undefined> {
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
  const exporting = !!exportReporter;
  const run = controller.createTestRun(request);

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
  logger.trace('executeRun: alvos', {
    tests: leafTests.length,
    suites: suiteCount,
    pathArgs: [...pathArgs],
    coverage,
  });
  // Root por folder (PRD-57): os folders das suites/testes realmente em execução,
  // em vez de sempre o primeiro do workspace.
  const roots = resolveRunRoots(
    leafTests.map((t) => state.getMeta(t)),
    folders,
  );
  state.setLastRun(deriveLastRun(included, !!request.include, coverage, state));
  for (let i = 0; i < suiteCount; i++) onSuiteStart?.();

  if (leafTests.length === 0) {
    run.appendOutput(`\r\n${t(locale, 'runner.noTests')}\r\n`);
    run.end();
    void vscode.commands.executeCommand('setContext', 'utplsql:running', false);
    return;
  }

  // Só abre atividade (e limpa o snapshot anterior) quando há algo para rodar:
  // um run vazio não pode vazar o token de atividade nem apagar o último estado.
  const activity = beginOracleActivity(cfg);
  state.clearLastResults();

  let exportText: string | undefined;
  let htmlReportPath: string | undefined;
  try {
    if (!exporting) {
      for (const item of leafTests) {
        run.enqueued(item);
      }
      for (const item of leafTests) run.started(item);
    }

    run.appendOutput(
      `${t(locale, 'runner.running', { coverage: coverage ? t(locale, 'runner.withCoverage') : '' })}\r\n`,
    );

    const oracleOpts: OracleRunOptions = {
      connection,
      pathArgs: [...pathArgs],
      coverage: {
        enabled: coverage,
        htmlReport: coverage && cfg.coverageHtmlReport,
        reportRoot: roots[0],
        onHtmlReport: (filePath) => {
          htmlReportPath = filePath;
        },
        owner: cfg.coverageOwner,
        schemes: cfg.coverageSchemes,
        includeObjects: cfg.coverageIncludeObjects,
        excludeObjects: cfg.coverageExcludeObjects,
        includeSchemaExpr: cfg.coverageIncludeSchemaExpr,
        includeObjectExpr: cfg.coverageIncludeObjectExpr,
        excludeSchemaExpr: cfg.coverageExcludeSchemaExpr,
        excludeObjectExpr: cfg.coverageExcludeObjectExpr,
      },
      sourcePath: cfg.sourcePath,
      run,
      leafTests,
      state,
      onComplete,
      onCoverageResult: (generated) => {
        if (generated) setupValidator.clearCoverageDiagnostic();
        else setupValidator.addCoverageDiagnostic();
      },
      folders,
      execution: {
        tags: cfg.tags,
        randomOrder: cfg.randomOrder,
        randomOrderSeed: cfg.randomOrderSeed,
        dbmsOutput: cfg.dbmsOutput,
        timeoutMinutes: cfg.timeoutMinutes,
      },
      output: { additionalReporters: cfg.additionalReporters },
      ...(exportReporter ? { export: { reporter: exportReporter } } : {}),
    };
    exportText = await executeRunOracle(oracleOpts, token);
    if (cfg.sqlCoverageEnabled && !exporting) {
      await applySqlCoverage({
        connection,
        roots,
        sourcePath: cfg.sourcePath,
        run,
        state,
        folders,
      });
    }
  } catch (e) {
    if (exporting) throw e;
    if (e instanceof RunAbortedError) {
      // Timeout/cancelamento: encerra sem aplicar resultados parciais. Os itens
      // não executados ficam explicitamente `skipped` (o Test Explorer não tem
      // um estado "não executado" terminal).
      run.appendOutput(
        `\r\n${t(locale, e.outcome === 'timedOut' ? 'runner.timedOut' : 'ext.runCancel')}\r\n`,
      );
      for (const item of leafTests) run.skipped(item);
    } else {
      const msg = formatUserError(e, locale, connection);
      run.appendOutput(`\r\n${t(locale, 'runner.oracleErrorHeader', { error: msg })}\r\n`);
      for (const item of leafTests) {
        run.errored(item, new vscode.TestMessage(t(locale, 'runner.oracleError', { error: msg })));
      }
    }
  } finally {
    run.end();
    void vscode.commands.executeCommand('setContext', 'utplsql:running', false);
    // PRD-108 RF2: a notificação é fire-and-forget e só começa depois do
    // run.end(), então nunca segura o spinner do Test Explorer.
    if (htmlReportPath) void offerCoverageHtmlReport(htmlReportPath);
    // PRD-101: run/cobertura/export cobrem a atividade; fecha o pool ocioso.
    await activity.end();
  }

  return exportText;
}
