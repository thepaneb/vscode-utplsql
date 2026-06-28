import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as vscode from 'vscode';

import { readConfig, resolveConnection } from './config';
import { discoverWorkspace } from './discovery';
import { runCli } from './cli';
import { parseJUnit, TestStatus } from './junit';
import { parseCobertura } from './cobertura';
import { resolveSourceUri } from './coverage';

type ItemMeta =
  | { kind: 'suite'; packageName: string; uri: vscode.Uri }
  | { kind: 'test'; packageName: string; procName: string; description: string; uri: vscode.Uri };

const meta = new WeakMap<vscode.TestItem, ItemMeta>();

// Cobertura detalhada por arquivo, preenchida durante o run e lida sob demanda.
const detailedCoverage = new Map<string, vscode.FileCoverageDetail[]>();

// Referências aos profiles, para que os runs disparados por comando/menu
// carreguem o profile correto (necessário para o loadDetailedCoverage).
let runProfileRef: vscode.TestRunProfile;
let coverageProfileRef: vscode.TestRunProfile;

export function activate(context: vscode.ExtensionContext) {
  const controller = vscode.tests.createTestController('utplsql', 'utPLSQL');
  context.subscriptions.push(controller);

  controller.resolveHandler = async (item) => {
    if (!item) {
      await refresh(controller);
    }
  };
  controller.refreshHandler = async () => {
    await refresh(controller);
  };

  runProfileRef = controller.createRunProfile(
    'Run',
    vscode.TestRunProfileKind.Run,
    (request, token) => executeRun(controller, request, token, false),
    true
  );

  coverageProfileRef = controller.createRunProfile(
    'Run with Coverage',
    vscode.TestRunProfileKind.Coverage,
    (request, token) => executeRun(controller, request, token, true),
    true
  );
  coverageProfileRef.loadDetailedCoverage = async (_run, fileCoverage) => {
    return detailedCoverage.get(fileCoverage.uri.toString()) ?? [];
  };

  context.subscriptions.push(runProfileRef, coverageProfileRef);

  // ---- Comandos / menus de contexto ----
  context.subscriptions.push(
    vscode.commands.registerCommand('utplsql.refresh', () => refresh(controller)),
    vscode.commands.registerCommand('utplsql.runAll', () =>
      executeRun(
        controller,
        new vscode.TestRunRequest(undefined, undefined, runProfileRef),
        new vscode.CancellationTokenSource().token,
        false
      )
    ),
    vscode.commands.registerCommand('utplsql.runFile', (uri: vscode.Uri) => runForUri(controller, uri, false)),
    vscode.commands.registerCommand('utplsql.runFileCoverage', (uri: vscode.Uri) => runForUri(controller, uri, true)),
    vscode.commands.registerCommand('utplsql.runFolder', (uri: vscode.Uri) => runForFolder(controller, uri, false)),
    vscode.commands.registerCommand('utplsql.runFolderCoverage', (uri: vscode.Uri) => runForFolder(controller, uri, true))
  );

  // Re-descobre quando arquivos mudam.
  const watcher = vscode.workspace.createFileSystemWatcher('**/*.{pks,pkb}');
  watcher.onDidCreate(() => refresh(controller));
  watcher.onDidChange(() => refresh(controller));
  watcher.onDidDelete(() => refresh(controller));
  context.subscriptions.push(watcher);

  // Descoberta inicial.
  refresh(controller);
}

export function deactivate() {
  /* nada a fazer */
}

// ---------------------------------------------------------------------------
// Descoberta
// ---------------------------------------------------------------------------
async function refresh(controller: vscode.TestController): Promise<void> {
  const cfg = readConfig();
  const suites = await discoverWorkspace(cfg.includePatterns);

  controller.items.replace([]);

  for (const suite of suites) {
    const suiteItem = controller.createTestItem(
      `suite:${suite.packageName.toLowerCase()}`,
      `${suite.suiteDescription}  (${suite.packageName})`,
      suite.uri
    );
    meta.set(suiteItem, { kind: 'suite', packageName: suite.packageName, uri: suite.uri });

    for (const t of suite.tests) {
      const testItem = controller.createTestItem(
        `test:${suite.packageName.toLowerCase()}.${t.procName.toLowerCase()}`,
        t.description,
        suite.uri
      );
      testItem.range = new vscode.Range(t.line, 0, t.line, 0);
      meta.set(testItem, {
        kind: 'test',
        packageName: suite.packageName,
        procName: t.procName,
        description: t.description,
        uri: suite.uri
      });
      suiteItem.children.add(testItem);
    }

    controller.items.add(suiteItem);
  }
}

// ---------------------------------------------------------------------------
// Comandos de menu → traduzem para um run
// ---------------------------------------------------------------------------
function collectAllItems(controller: vscode.TestController): vscode.TestItem[] {
  const out: vscode.TestItem[] = [];
  controller.items.forEach((i) => out.push(i));
  return out;
}

async function runForUri(controller: vscode.TestController, uri: vscode.Uri, coverage: boolean) {
  await refresh(controller);
  const base = path.basename(uri.fsPath).replace(/\.(pks|pkb)$/i, '').toLowerCase();
  const include = collectAllItems(controller).filter((i) => {
    const m = meta.get(i);
    return m?.kind === 'suite' && path.basename(m.uri.fsPath).replace(/\.(pks|pkb)$/i, '').toLowerCase() === base;
  });
  if (include.length === 0) {
    vscode.window.showWarningMessage('Nenhuma suite utPLSQL encontrada neste arquivo.');
    return;
  }
  const profile = coverage ? coverageProfileRef : runProfileRef;
  await executeRun(
    controller,
    new vscode.TestRunRequest(include, undefined, profile),
    new vscode.CancellationTokenSource().token,
    coverage
  );
}

async function runForFolder(controller: vscode.TestController, uri: vscode.Uri, coverage: boolean) {
  await refresh(controller);
  const folder = uri.fsPath.toLowerCase();
  const include = collectAllItems(controller).filter((i) => {
    const m = meta.get(i);
    return m?.kind === 'suite' && m.uri.fsPath.toLowerCase().startsWith(folder + path.sep);
  });
  if (include.length === 0) {
    vscode.window.showWarningMessage('Nenhuma suite utPLSQL encontrada nesta pasta.');
    return;
  }
  const profile = coverage ? coverageProfileRef : runProfileRef;
  await executeRun(
    controller,
    new vscode.TestRunRequest(include, undefined, profile),
    new vscode.CancellationTokenSource().token,
    coverage
  );
}

// ---------------------------------------------------------------------------
// Execução
// ---------------------------------------------------------------------------
async function executeRun(
  controller: vscode.TestController,
  request: vscode.TestRunRequest,
  token: vscode.CancellationToken,
  coverage: boolean
): Promise<void> {
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  if (!workspaceFolder) {
    vscode.window.showErrorMessage('Abra uma pasta/projeto para rodar os testes utPLSQL.');
    return;
  }
  const connection = await resolveConnection();
  if (!connection) {
    vscode.window.showErrorMessage('Conexão Oracle não informada.');
    return;
  }

  const cfg = readConfig();
  const root = workspaceFolder.uri.fsPath;
  const run = controller.createTestRun(request);

  // Coleta itens a executar (leaf tests) e os "paths" do utPLSQL.
  const leafTests: vscode.TestItem[] = [];
  const pathArgs = new Set<string>();

  const included: vscode.TestItem[] = [];
  if (request.include) {
    request.include.forEach((i) => included.push(i));
  } else {
    controller.items.forEach((i) => included.push(i));
  }

  for (const item of included) {
    const m = meta.get(item);
    if (!m) {
      continue;
    }
    if (m.kind === 'suite') {
      pathArgs.add(m.packageName);
      item.children.forEach((c) => leafTests.push(c));
    } else {
      pathArgs.add(`${m.packageName}.${m.procName}`);
      leafTests.push(item);
    }
  }

  for (const t of leafTests) {
    run.enqueued(t);
  }
  leafTests.forEach((t) => run.started(t));

  // Arquivos de saída em pasta temporária.
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'utplsql-'));
  const junitPath = path.join(tmpDir, 'results.xml');
  const coveragePath = path.join(tmpDir, 'coverage.xml');

  const args: string[] = ['run', connection];
  for (const p of pathArgs) {
    args.push(`-p=${p}`);
  }
  // Reporter de documentação vai para o stdout (logs amigáveis na view de testes).
  args.push('-f=ut_documentation_reporter', '-c');
  // Reporter JUnit para arquivo (resultados estruturados).
  args.push('-f=ut_junit_reporter', `-o=${junitPath}`);

  if (coverage) {
    args.push('-f=ut_coverage_cobertura_reporter', `-o=${coveragePath}`);
    args.push(`-source_path=${cfg.sourcePath}`);
    // Owner = setting ou schema da conexao (parte antes da 1a '/'), em maiusculas.
    const owner = cfg.coverageOwner.trim() || connection.split('/')[0].toUpperCase();
    args.push(`-owner=${owner}`);
    // Mapeia a cobertura aos arquivos-fonte (regex/type_mapping configuraveis).
    args.push(...cfg.coverageSourceArgs);
  }
  args.push(...cfg.extraRunArgs);

  run.appendOutput(`Rodando utPLSQL${coverage ? ' (com cobertura)' : ''}...\r\n`);

  const result = await runCli(cfg.cliPath, args, root, token, (chunk) => {
    run.appendOutput(chunk.replace(/\r?\n/g, '\r\n'));
  });

  if (result.stderr.trim()) {
    run.appendOutput(`\r\n[stderr]\r\n${result.stderr.replace(/\r?\n/g, '\r\n')}\r\n`);
  }

  // ---- Resultados ----
  applyResults(junitPath, leafTests, run);

  // ---- Cobertura ----
  if (coverage) {
    applyCoverage(coveragePath, root, cfg.sourcePath, run);
  }

  try {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  } catch {
    /* ignore */
  }

  run.end();
}

function applyResults(junitPath: string, leafTests: vscode.TestItem[], run: vscode.TestRun): void {
  if (!fs.existsSync(junitPath)) {
    leafTests.forEach((t) => run.errored(t, new vscode.TestMessage('Sem relatório de resultados (o CLI falhou?).')));
    return;
  }

  const cases = parseJUnit(fs.readFileSync(junitPath, 'utf8'));

  // Índice: packageName|name → item (name = procName ou descrição).
  const index = new Map<string, vscode.TestItem>();
  for (const t of leafTests) {
    const m = meta.get(t);
    if (m?.kind !== 'test') {
      continue;
    }
    const pkg = m.packageName.toLowerCase();
    index.set(`${pkg}|${m.procName.toLowerCase()}`, t);
    index.set(`${pkg}|${m.description.toLowerCase().trim()}`, t);
  }

  const matched = new Set<vscode.TestItem>();

  for (const c of cases) {
    const pkg = lastSegment(c.classname).toLowerCase();
    const name = c.name.toLowerCase().trim();
    const item = index.get(`${pkg}|${name}`) ?? findByNameOnly(leafTests, name);
    if (!item) {
      continue;
    }
    matched.add(item);
    report(run, item, c.status, c.message, c.durationMs);
  }

  // Itens sem resultado correspondente.
  for (const t of leafTests) {
    if (!matched.has(t)) {
      run.skipped(t);
    }
  }
}

function report(run: vscode.TestRun, item: vscode.TestItem, status: TestStatus, message?: string, ms?: number) {
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

function findByNameOnly(items: vscode.TestItem[], name: string): vscode.TestItem | undefined {
  for (const t of items) {
    const m = meta.get(t);
    if (m?.kind === 'test') {
      if (m.procName.toLowerCase() === name || m.description.toLowerCase().trim() === name) {
        return t;
      }
    }
  }
  return undefined;
}

function lastSegment(classname: string): string {
  const parts = classname.split(/[.:]/).filter(Boolean);
  return parts.length ? parts[parts.length - 1] : classname;
}

function applyCoverage(coveragePath: string, root: string, sourcePath: string, run: vscode.TestRun): void {
  detailedCoverage.clear();
  if (!fs.existsSync(coveragePath)) {
    run.appendOutput('\r\n[cobertura] relatório não gerado — verifique o GRANT EXECUTE ON SYS.DBMS_PROFILER.\r\n');
    return;
  }

  const files = parseCobertura(fs.readFileSync(coveragePath, 'utf8'));
  let mappedCount = 0;

  for (const f of files) {
    const uri = resolveSourceUri(f.file, root, sourcePath);
    if (!uri) {
      continue;
    }
    const details: vscode.FileCoverageDetail[] = f.lines.map(
      (l) => new vscode.StatementCoverage(l.hits, new vscode.Position(Math.max(0, l.line - 1), 0))
    );
    if (details.length === 0) {
      continue;
    }
    const fc = vscode.FileCoverage.fromDetails(uri, details);
    detailedCoverage.set(uri.toString(), details);
    run.addCoverage(fc);
    mappedCount++;
  }

  if (mappedCount === 0) {
    run.appendOutput(
      '\r\n[cobertura] nenhum arquivo mapeado. Ajuste "utplsql.sourcePath" para a pasta do código-fonte.\r\n'
    );
  }
}
