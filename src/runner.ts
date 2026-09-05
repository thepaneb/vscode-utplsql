import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import * as vscode from 'vscode';
import { runCli } from './cli';
import { getCliInfo, semverLt } from './cliInfo';
import { listReporters } from './cliReporters';
import { compilationDiagnostics } from './compilationDiagnostics';
import { getExtensionLocale, readConfig, resolveConnection } from './config';
import { t } from './i18n';
import { buildInvocation, isInvocationError } from './invocation';
import { parseJUnit } from './junit';
import { executeRunOracle, type OracleRunOptions } from './oracleRunner';
import { setupValidator } from './quickfix';
import { applyCoverageFromXml, applyResultsFromCases, countResults } from './results';
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
  compilationDiagnostics.clear();

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

  const info = await getCliInfo(cfg, connection);
  if ('error' in info) {
    run.appendOutput(`${t(locale, 'runner.infoCli', { error: info.error })}\r\n`);
  } else {
    run.appendOutput(
      t(locale, 'runner.cliInfo', {
        cli: info.cliVersion,
        api: info.apiVersion,
        db: info.dbVersion ? t(locale, 'runner.dbVersion', { version: info.dbVersion }) : '',
      }) + '\r\n',
    );
    if (info.dbVersion && semverLt(info.dbVersion, '3.1.0')) {
      run.appendOutput(`${t(locale, 'runner.oldVersion')}\r\n`);
    }
  }

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

  for (const t of leafTests) {
    run.enqueued(t);
  }
  for (const t of leafTests) run.started(t);

  const useOracle = cfg.runnerMode === 'oracle' || cfg.runnerMode === 'auto';
  if (useOracle) {
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
      run.end();
      vscode.commands.executeCommand('setContext', 'utplsql:running', false);
      return;
    } catch (e) {
      if (cfg.runnerMode === 'oracle') {
        const msg = e instanceof Error ? e.message : String(e);
        run.appendOutput(`\r\n${t(locale, 'runner.oracleErrorHeader', { error: msg })}\r\n`);
        for (const item of leafTests) {
          run.errored(
            item,
            new vscode.TestMessage(t(locale, 'runner.oracleError', { error: msg })),
          );
        }
        run.end();
        vscode.commands.executeCommand('setContext', 'utplsql:running', false);
        return;
      }
      run.appendOutput(
        `${t(locale, 'runner.oracleUnavailable', { error: e instanceof Error ? e.message : String(e) })}\r\n`,
      );
    }
  }

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'utplsql-'));
  const junitPath = path.join(tmpDir, 'results.xml');
  const coveragePath = path.join(tmpDir, 'coverage.xml');

  const args: string[] = ['run', connection];
  for (const p of pathArgs) {
    args.push(`-p=${p}`);
  }
  args.push('-f=ut_documentation_reporter', '-c');
  args.push('-f=ut_junit_reporter', `-o=${junitPath}`);

  const extraReporter = state.consumeExtraReporter();
  if (extraReporter) {
    run.appendOutput(`${t(locale, 'runner.extraReporter', { name: extraReporter })}\r\n`);
    args.push(`-f=${extraReporter}`);
  }

  let coverageEnabled = coverage;
  if (coverage) {
    const reporters = await listReporters(cfg, connection);
    if ('error' in reporters) {
      coverageEnabled = false;
      run.appendOutput(`${t(locale, 'runner.reporterListFailed', { error: reporters.error })}\r\n`);
      run.appendOutput(`${t(locale, 'runner.reporterListNoCoverage')}\r\n`);
    } else if (!reporters.some((r) => r.toUpperCase() === 'UT_COVERAGE_COBERTURA_REPORTER')) {
      coverageEnabled = false;
      run.appendOutput(`\r\n${t(locale, 'runner.reporterMissing')}\r\n`);
    } else {
      args.push('-f=ut_coverage_cobertura_reporter', `-o=${coveragePath}`);
      args.push(`-source_path=${cfg.sourcePath}`);
      const owner = cfg.coverageOwner.trim() || connection.split('/')[0].toUpperCase();
      args.push(`-owner=${owner}`);
      args.push(...cfg.coverageSourceArgs);
    }
  }

  for (const r of cfg.additionalReporters) {
    if (
      r.toUpperCase() === 'UT_DOCUMENTATION_REPORTER' ||
      r.toUpperCase() === 'UT_JUNIT_REPORTER' ||
      r.toUpperCase() === 'UT_COVERAGE_COBERTURA_REPORTER'
    ) {
      continue;
    }
    args.push(`-f=${r}`);
  }

  if (cfg.timeoutMinutes !== 60) {
    args.push(`-t=${cfg.timeoutMinutes}`);
  }
  if (cfg.dbmsOutput) {
    args.push('-D');
  }
  if (cfg.quiet) {
    args.push('-q');
  }
  if (cfg.failureExitCode !== 1) {
    args.push(`--failure-exit-code=${cfg.failureExitCode}`);
  }
  args.push(...cfg.extraRunArgs);

  run.appendOutput(
    `${t(locale, 'runner.running', { coverage: coverage ? t(locale, 'runner.withCoverage') : '' })}\r\n`,
  );

  const inv = buildInvocation(cfg, args);
  if (isInvocationError(inv)) {
    run.appendOutput(`\r\n[erro] ${t(locale, 'runner.invocationError', { error: inv.error })}\r\n`);
    vscode.window.showErrorMessage(inv.error);
    for (const t of leafTests) run.errored(t, new vscode.TestMessage(inv.error));
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
    run.end();
    vscode.commands.executeCommand('setContext', 'utplsql:running', false);
    return;
  }

  const safeArgs = inv.args.map((a) => (a === connection ? '***' : a.replace(connection, '***')));
  run.appendOutput(`[debug] CLI: ${inv.file} ${safeArgs.join(' ')}\r\n`);

  let compilerOutput = '';
  const result = await runCli(inv.file, inv.args, inv.shell, root, token, (chunk) => {
    compilerOutput += chunk;
    run.appendOutput(chunk.replace(/\r?\n/g, '\r\n'));
  });

  if (result.stderr.trim()) {
    compilerOutput += result.stderr;
    run.appendOutput(
      `\r\n${t(locale, 'runner.stderr')}\r\n${result.stderr.replace(/\r?\n/g, '\r\n')}\r\n`,
    );
  }

  if (cfg.compilationDiagnosticsEnabled && compilerOutput) {
    const errors = compilationDiagnostics.parseFromOutput(compilerOutput);
    if (errors.length > 0) {
      compilationDiagnostics.resolveFiles(errors, state);
      compilationDiagnostics.apply(errors);
    }
  }

  const resultMap = applyResults(junitPath, leafTests, run, state);
  state.setLastResults(resultMap);
  state.setLastFailedItems(
    leafTests.filter((t) => {
      const r = resultMap.get(t.id);
      return r?.status === 'failed' || r?.status === 'error';
    }),
  );
  vscode.commands.executeCommand(
    'setContext',
    'utplsql:hasFailures',
    state.getLastFailedItems().length > 0,
  );
  if (coverageEnabled) {
    applyCoverage(coveragePath, root, cfg.sourcePath, run, state, folders);
  }

  if (cfg.sqlCoverageEnabled) {
    await applySqlCoverage({ connection, root, sourcePath: cfg.sourcePath, run, state, folders });
  }

  if (onComplete && fs.existsSync(junitPath)) {
    const cases = parseJUnit(fs.readFileSync(junitPath, 'utf8'));
    const r = countResults(cases);
    onComplete(r.passed, r.failed, r.skipped, r.errored, r.totalMs);
  }

  try {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  } catch {
    /* ignore */
  }
  run.end();
  vscode.commands.executeCommand('setContext', 'utplsql:running', false);
}

export function applyResults(
  junitPath: string,
  leafTests: vscode.TestItem[],
  run: vscode.TestRun,
  state: TestStateManager,
): ReturnType<typeof applyResultsFromCases> {
  if (!fs.existsSync(junitPath)) {
    for (const item of leafTests) {
      run.errored(item, new vscode.TestMessage(t(getExtensionLocale(), 'runner.noResults')));
    }
    return new Map();
  }

  const cases = parseJUnit(fs.readFileSync(junitPath, 'utf8'));
  return applyResultsFromCases(cases, leafTests, run, state);
}

export function applyCoverage(
  coveragePath: string,
  root: string,
  sourcePath: string,
  run: vscode.TestRun,
  state: TestStateManager,
  folders?: readonly vscode.WorkspaceFolder[],
): void {
  const locale = getExtensionLocale();
  state.clearCoverage();
  if (!fs.existsSync(coveragePath)) {
    const tmpDir = path.dirname(coveragePath);
    const siblingFiles = (() => {
      try {
        return fs.readdirSync(tmpDir).join(', ') || '(vazio)';
      } catch {
        return '(diretório não encontrado)';
      }
    })();
    run.appendOutput(
      t(locale, 'runner.coverNoReport', {
        path: coveragePath,
        dir: tmpDir,
        files: siblingFiles,
      }) + '\r\n',
    );
    if (readConfig().setupDiagnosticsEnabled) {
      setupValidator.addCoverageDiagnostic();
    }
    return;
  }

  applyCoverageFromXml(
    fs.readFileSync(coveragePath, 'utf8'),
    sourcePath,
    root,
    run,
    state,
    folders,
  );
}
