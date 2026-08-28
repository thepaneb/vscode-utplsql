import * as vscode from 'vscode';
import { parseCobertura } from './cobertura';
import { resolveSourceUri } from './coverage';
import { isUserFrame, type StackFrame, type TestCaseResult, type TestStatus } from './junit';
import { buildMatchIndex, findByNameOnly, type MatchEntry } from './matching';
import type { TestStateManager } from './state';

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

export function lastSegment(classname: string): string {
  const parts = classname.split(/[.:]/).filter(Boolean);
  return parts.length ? parts[parts.length - 1] : classname;
}

export function resolveStackFrameToUri(
  stackFrames: StackFrame[],
  state: TestStateManager,
): vscode.Location | undefined {
  const userFrame = stackFrames.find(isUserFrame);
  if (!userFrame || userFrame.line <= 0) return undefined;

  const objName = userFrame.objectName.toLowerCase();
  const pos = new vscode.Position(Math.max(0, userFrame.line - 1), 0);

  for (const item of state.cachedItems) {
    const meta = state.getMeta(item);
    if (!meta?.uri || meta.kind !== 'suite') continue;
    if (meta.packageName.toLowerCase() !== objName) continue;
    return new vscode.Location(meta.uri, pos);
  }

  const folders = vscode.workspace.workspaceFolders;
  if (folders) {
    for (const folder of folders) {
      return new vscode.Location(vscode.Uri.joinPath(folder.uri, `${objName}.pks`), pos);
    }
  }

  return undefined;
}

export function applyResultsFromCases(
  cases: TestCaseResult[],
  leafTests: vscode.TestItem[],
  run: vscode.TestRun,
  state: TestStateManager,
): Map<string, { status: TestStatus; message?: string }> {
  const resultMap = new Map<string, { status: TestStatus; message?: string }>();

  const entries: MatchEntry[] = [];
  for (const t of leafTests) {
    const m = state.getMeta(t);
    if (!m) continue;
    entries.push({ item: t, meta: m });
  }
  const index = buildMatchIndex(entries);

  const matched = new Set<vscode.TestItem>();

  for (const c of cases) {
    const pkg = lastSegment(c.classname).toLowerCase();
    const name = c.name.toLowerCase().trim();
    let item = index.get(`${pkg}|${name}`);
    if (!item) {
      item = findByNameOnly(entries, name);
    }
    if (!item) continue;
    matched.add(item);
    resultMap.set(item.id, { status: c.status, message: c.message });

    switch (c.status) {
      case 'passed':
        run.passed(item, c.durationMs);
        break;
      case 'failed': {
        const msg = new vscode.TestMessage(c.message ?? 'Falhou');
        if (c.stackFrames) {
          const loc = resolveStackFrameToUri(c.stackFrames, state);
          if (loc) msg.location = loc;
        }
        run.failed(item, msg, c.durationMs);
        break;
      }
      case 'error': {
        const msg = new vscode.TestMessage(c.message ?? 'Erro');
        if (c.stackFrames) {
          const loc = resolveStackFrameToUri(c.stackFrames, state);
          if (loc) msg.location = loc;
        }
        run.errored(item, msg, c.durationMs);
        break;
      }
      case 'skipped':
        run.skipped(item);
        break;
    }
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

export function applyCoverageFromXml(
  covXml: string,
  sourcePath: string,
  _root: string,
  run: vscode.TestRun,
  state: TestStateManager,
  folders?: readonly vscode.WorkspaceFolder[],
): void {
  state.clearCoverage();
  const files = parseCobertura(covXml);
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
