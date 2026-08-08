import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import * as vscode from 'vscode';
import { runCli } from './cli';
import { getCliInfo, semverLt } from './cliInfo';
import { listReporters } from './cliReporters';
import { parseCobertura } from './cobertura';
import { compilationDiagnostics } from './compilationDiagnostics';
import { readConfig, resolveConnection } from './config';
import { resolveSourceUri } from './coverage';
import { buildInvocation, isInvocationError } from './invocation';
import {
  isUserFrame,
  parseJUnit,
  type StackFrame,
  type TestCaseResult,
  type TestStatus,
} from './junit';
import { executeRunOracle } from './oracleRunner';
import { setupValidator } from './quickfix';
import type { TestStateManager } from './state';

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
    vscode.window.showErrorMessage('Abra uma pasta/projeto para rodar os testes utPLSQL.');
    return;
  }
  const connection = await resolveConnection();
  if (!connection) {
    vscode.window.showErrorMessage('Conexão Oracle não informada.');
    return;
  }

  const cfg = readConfig();
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
    run.appendOutput(`[aviso] Não foi possível obter info do CLI: ${info.error}\r\n`);
  } else {
    run.appendOutput(
      `[info] CLI ${info.cliVersion} | API ${info.apiVersion}` +
        (info.dbVersion ? ` | DB utPLSQL ${info.dbVersion}` : '') +
        '\r\n',
    );
    if (info.dbVersion && semverLt(info.dbVersion, '3.1.0')) {
      run.appendOutput(
        '[aviso] utPLSQL no banco é anterior a 3.1.0 — cobertura pode não funcionar.\r\n',
      );
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
      await executeRunOracle(
        connection,
        [...pathArgs],
        coverage,
        cfg.sourcePath,
        root,
        run,
        leafTests,
        state,
        token,
        onComplete,
        folders,
      );
      run.end();
      vscode.commands.executeCommand('setContext', 'utplsql:running', false);
      return;
    } catch (e) {
      if (cfg.runnerMode === 'oracle') {
        const msg = e instanceof Error ? e.message : String(e);
        run.appendOutput(`\r\n[erro] Oracle runner: ${msg}\r\n`);
        for (const t of leafTests) {
          run.errored(t, new vscode.TestMessage(`Oracle runner: ${msg}`));
        }
        run.end();
        vscode.commands.executeCommand('setContext', 'utplsql:running', false);
        return;
      }
      run.appendOutput(
        `[aviso] Oracle runner indisponível, fallback para CLI: ${e instanceof Error ? e.message : String(e)}\r\n`,
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
    run.appendOutput(`[info] Reporter adicional da sessão: ${extraReporter}\r\n`);
    args.push(`-f=${extraReporter}`);
  }

  let coverageEnabled = coverage;
  if (coverage) {
    const reporters = await listReporters(cfg, connection);
    if ('error' in reporters) {
      coverageEnabled = false;
      run.appendOutput(`[aviso] Não foi possível listar reporters: ${reporters.error}\r\n`);
      run.appendOutput('[aviso] Continuando sem cobertura.\r\n');
    } else if (!reporters.some((r) => r.toUpperCase() === 'UT_COVERAGE_COBERTURA_REPORTER')) {
      coverageEnabled = false;
      run.appendOutput(
        '\r\n[aviso] Reporter UT_COVERAGE_COBERTURA_REPORTER não disponível no banco.\r\n' +
          'Cobertura desabilitada. Verifique se o pacote utPLSQL está atualizado.\r\n',
      );
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

  run.appendOutput(`Rodando utPLSQL${coverage ? ' (com cobertura)' : ''}...\r\n`);

  const inv = buildInvocation(cfg, args);
  if (isInvocationError(inv)) {
    run.appendOutput(`\r\n[erro] ${inv.error}\r\n`);
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
    run.appendOutput(`\r\n[stderr]\r\n${result.stderr.replace(/\r?\n/g, '\r\n')}\r\n`);
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

export interface RunResults {
  passed: number;
  failed: number;
  skipped: number;
  errored: number;
  totalMs: number;
}

export function countResults(cases: TestCaseResult[]): RunResults {
  let passed = 0;
  let failed = 0;
  let skipped = 0;
  let errored = 0;
  let totalMs = 0;
  for (const c of cases) {
    switch (c.status) {
      case 'passed':
        passed++;
        break;
      case 'failed':
        failed++;
        break;
      case 'skipped':
        skipped++;
        break;
      case 'error':
        errored++;
        break;
    }
    totalMs += c.durationMs ?? 0;
  }
  return { passed, failed, skipped, errored, totalMs };
}

export function applyResults(
  junitPath: string,
  leafTests: vscode.TestItem[],
  run: vscode.TestRun,
  state: TestStateManager,
): Map<string, { status: TestStatus; message?: string }> {
  const resultMap = new Map<string, { status: TestStatus; message?: string }>();
  if (!fs.existsSync(junitPath)) {
    for (const t of leafTests) {
      run.errored(t, new vscode.TestMessage('Sem relatório de resultados (o CLI falhou?).'));
    }
    return resultMap;
  }

  const cases = parseJUnit(fs.readFileSync(junitPath, 'utf8'));

  const index = new Map<string, vscode.TestItem>();
  for (const t of leafTests) {
    const m = state.getMeta(t);
    if (m?.kind !== 'test') continue;
    const pkg = m.packageName.toLowerCase();
    index.set(`${pkg}|${m.procName.toLowerCase()}`, t);
    index.set(`${pkg}|${m.description.toLowerCase().trim()}`, t);
  }

  const matched = new Set<vscode.TestItem>();

  for (const c of cases) {
    const pkg = lastSegment(c.classname).toLowerCase();
    const name = c.name.toLowerCase().trim();
    const item = index.get(`${pkg}|${name}`) ?? findByNameOnly(leafTests, name, state);
    if (!item) continue;
    matched.add(item);
    resultMap.set(item.id, { status: c.status, message: c.message });
    report(run, item, c.status, c.message, c.durationMs, c.stackFrames, state);
  }

  for (const t of leafTests) {
    if (!matched.has(t)) {
      const m = state.getMeta(t);
      run.appendOutput(
        `[aviso] Nenhum resultado JUnit encontrado para "${t.id}".` +
          (m && m.kind === 'test' ? ` packageName esperado: ${m.packageName}\r\n` : '\r\n'),
      );
      run.skipped(t);
    }
  }

  return resultMap;
}

function report(
  run: vscode.TestRun,
  item: vscode.TestItem,
  status: TestStatus,
  message?: string,
  ms?: number,
  stackFrames?: StackFrame[],
  state?: TestStateManager,
): void {
  let testMessage: vscode.TestMessage | undefined;
  switch (status) {
    case 'passed':
      run.passed(item, ms);
      break;
    case 'failed':
      testMessage = new vscode.TestMessage(message ?? 'Falhou');
      if (stackFrames && state) {
        const loc = resolveStackFrameToUri(stackFrames, state);
        if (loc) testMessage.location = loc;
      }
      run.failed(item, testMessage, ms);
      break;
    case 'error':
      testMessage = new vscode.TestMessage(message ?? 'Erro');
      if (stackFrames && state) {
        const loc = resolveStackFrameToUri(stackFrames, state);
        if (loc) testMessage.location = loc;
      }
      run.errored(item, testMessage, ms);
      break;
    case 'skipped':
      run.skipped(item);
      break;
  }
}

export function findByNameOnly(
  items: vscode.TestItem[],
  name: string,
  state: TestStateManager,
): vscode.TestItem | undefined {
  for (const t of items) {
    const m = state.getMeta(t);
    if (m?.kind === 'test') {
      if (m.procName.toLowerCase() === name || m.description.toLowerCase().trim() === name) {
        return t;
      }
    }
  }
  return undefined;
}

export function lastSegment(classname: string): string {
  const parts = classname.split(/[.:]/).filter(Boolean);
  return parts.length ? parts[parts.length - 1] : classname;
}

function resolveStackFrameToUri(
  stackFrames: StackFrame[],
  state: TestStateManager,
): vscode.Location | undefined {
  const userFrame = stackFrames.find(isUserFrame);
  if (!userFrame || userFrame.line <= 0) return undefined;

  const objName = userFrame.objectName.toLowerCase();

  for (const item of state.cachedItems) {
    const meta = state.getMeta(item);
    if (!meta?.uri) continue;
    if (meta.kind !== 'suite') continue;
    if (meta.packageName.toLowerCase() !== objName) continue;

    const line = Math.max(0, userFrame.line - 1);
    const pos = new vscode.Position(line, 0);
    return new vscode.Location(meta.uri, pos);
  }

  const folders = vscode.workspace.workspaceFolders;
  if (folders) {
    for (const folder of folders) {
      const pksUri = vscode.Uri.joinPath(folder.uri, `${objName}.pks`);
      const line = Math.max(0, userFrame.line - 1);
      const pos = new vscode.Position(line, 0);
      return new vscode.Location(pksUri, pos);
    }
  }

  return undefined;
}

export function applyCoverage(
  coveragePath: string,
  _root: string,
  sourcePath: string,
  run: vscode.TestRun,
  state: TestStateManager,
  folders?: readonly vscode.WorkspaceFolder[],
): void {
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
      `\r\n[cobertura] relatório não gerado.\r\n` +
        `  esperado em: ${coveragePath}\r\n` +
        `  arquivos em ${tmpDir}: ${siblingFiles}\r\n` +
        `  verifique o GRANT EXECUTE ON SYS.DBMS_PROFILER.\r\n`,
    );
    if (readConfig().setupDiagnosticsEnabled) {
      setupValidator.addCoverageDiagnostic();
    }
    return;
  }

  const files = parseCobertura(fs.readFileSync(coveragePath, 'utf8'));
  let mappedCount = 0;

  for (const f of files) {
    let uri: vscode.Uri | undefined;
    for (const folder of folders ?? []) {
      uri = resolveSourceUri(f.file, folder.uri.fsPath, sourcePath, folder.uri.fsPath);
      if (uri) break;
    }
    if (!uri) continue;
    const details: vscode.FileCoverageDetail[] = f.lines.map(
      (l) => new vscode.StatementCoverage(l.hits, new vscode.Position(Math.max(0, l.line - 1), 0)),
    );
    if (details.length === 0) continue;
    const fc = vscode.FileCoverage.fromDetails(uri, details);
    state.setCoverage(uri.toString(), details);
    run.addCoverage(fc);
    mappedCount++;
  }

  if (mappedCount === 0) {
    run.appendOutput(
      '\r\n[cobertura] nenhum arquivo mapeado. Ajuste "utplsql.sourcePath" para a pasta do código-fonte.\r\n',
    );
  }
}
