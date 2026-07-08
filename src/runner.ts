import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import * as vscode from 'vscode';
import { runCli } from './cli';
import { parseCobertura } from './cobertura';
import { readConfig, resolveConnection } from './config';
import { resolveSourceUri } from './coverage';
import { buildInvocation, isInvocationError } from './invocation';
import { parseJUnit, type TestStatus } from './junit';
import type { TestStateManager } from './state';

export async function executeRun(
  controller: vscode.TestController,
  request: vscode.TestRunRequest,
  token: vscode.CancellationToken,
  coverage: boolean,
  state: TestStateManager,
  onSuiteStart?: () => void,
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

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'utplsql-'));
  const junitPath = path.join(tmpDir, 'results.xml');
  const coveragePath = path.join(tmpDir, 'coverage.xml');

  const args: string[] = ['run', connection];
  for (const p of pathArgs) {
    args.push(`-p=${p}`);
  }
  args.push('-f=ut_documentation_reporter', '-c');
  args.push('-f=ut_junit_reporter', `-o=${junitPath}`);

  if (coverage) {
    args.push('-f=ut_coverage_cobertura_reporter', `-o=${coveragePath}`);
    args.push(`-source_path=${cfg.sourcePath}`);
    const owner = cfg.coverageOwner.trim() || connection.split('/')[0].toUpperCase();
    args.push(`-owner=${owner}`);
    args.push(...cfg.coverageSourceArgs);
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
    return;
  }

  const result = await runCli(inv.file, inv.args, inv.shell, root, token, (chunk) => {
    run.appendOutput(chunk.replace(/\r?\n/g, '\r\n'));
  });

  if (result.stderr.trim()) {
    run.appendOutput(`\r\n[stderr]\r\n${result.stderr.replace(/\r?\n/g, '\r\n')}\r\n`);
  }

  applyResults(junitPath, leafTests, run, state);
  if (coverage) {
    applyCoverage(coveragePath, root, cfg.sourcePath, run, state, folders);
  }

  try {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  } catch {
    /* ignore */
  }
  run.end();
}

export function applyResults(
  junitPath: string,
  leafTests: vscode.TestItem[],
  run: vscode.TestRun,
  state: TestStateManager,
): void {
  if (!fs.existsSync(junitPath)) {
    for (const t of leafTests) {
      run.errored(t, new vscode.TestMessage('Sem relatório de resultados (o CLI falhou?).'));
    }
    return;
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
    report(run, item, c.status, c.message, c.durationMs);
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
}

function report(
  run: vscode.TestRun,
  item: vscode.TestItem,
  status: TestStatus,
  message?: string,
  ms?: number,
): void {
  switch (status) {
    case 'passed':
      run.passed(item, ms);
      break;
    case 'failed':
      run.failed(item, new vscode.TestMessage(message ?? 'Falhou'), ms);
      break;
    case 'error':
      run.errored(item, new vscode.TestMessage(message ?? 'Erro'), ms);
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

function applyCoverage(
  coveragePath: string,
  _root: string,
  sourcePath: string,
  run: vscode.TestRun,
  state: TestStateManager,
  folders?: readonly vscode.WorkspaceFolder[],
): void {
  state.clearCoverage();
  if (!fs.existsSync(coveragePath)) {
    run.appendOutput(
      '\r\n[cobertura] relatório não gerado — verifique o GRANT EXECUTE ON SYS.DBMS_PROFILER.\r\n',
    );
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
