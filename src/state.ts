import type * as vscode from 'vscode';
import type { SuiteFile } from './discovery';
import type { TestStatus } from './junit';
import { CoverageStore } from './stateStore/coverageStore';
import type { TestLineResult } from './stateStore/persisted';
import { RunSnapshot } from './stateStore/runSnapshot';
import { TestItemIndex } from './stateStore/testItemIndex';
import type { ItemMeta } from './types';

export { COVERAGE_STORE_MAX_ENTRIES } from './stateStore/coverageStore';
export type { PersistedResult, PersistedRun, TestLineResult } from './stateStore/persisted';

/** Reexportado para compatibilidade dos call sites/testes (PRD-56/PRD-139). */
export {
  PERSIST_KEY,
  PERSIST_MAX_AGE_DAYS,
  PERSIST_MAX_ENTRIES,
  PERSIST_MESSAGE_LIMIT,
  truncateMessage,
} from './stateStore/persisted';
export type { LastRunState } from './stateStore/runSnapshot';

/** `(850ms)` / `(1.2s)` para o label do teste (PRD-56 RF4). */
export function formatDuration(durationMs: number): string {
  return durationMs < 1000 ? `${Math.round(durationMs)}ms` : `${(durationMs / 1000).toFixed(1)}s`;
}

const DURATION_SUFFIX_RE = / \(\d+(?:\.\d+)?(?:ms|s)\)$/;

/**
 * Aplica o sufixo de duração ao label, **substituindo** um sufixo anterior
 * (idempotente entre execuções). Com `show` falso remove o sufixo.
 */
export function withDurationSuffix(
  base: string,
  durationMs: number | undefined,
  show: boolean,
): string {
  const clean = base.replace(DURATION_SUFFIX_RE, '');
  if (!show || durationMs === undefined || !Number.isFinite(durationMs) || durationMs < 0) {
    return clean;
  }
  return `${clean} (${formatDuration(durationMs)})`;
}

export class TestStateManager {
  private readonly coverageStore = new CoverageStore();
  private readonly index = new TestItemIndex();
  private readonly snapshot = new RunSnapshot();

  /** Modo global de cobertura da sessão (PRD-54). Não persiste. */
  coverageAlways = false;
  setCoverageAlways(value: boolean): void {
    this.coverageAlways = value;
  }

  get cachedItems(): vscode.TestItem[] {
    return this.index.cachedItems;
  }
  set cachedItems(items: vscode.TestItem[]) {
    this.index.cachedItems = items;
  }

  get discoveredFiles(): SuiteFile[] {
    return this.index.discoveredFiles;
  }
  set discoveredFiles(files: SuiteFile[]) {
    this.index.discoveredFiles = files;
  }

  runProfile?: vscode.TestRunProfile;
  coverageProfile?: vscode.TestRunProfile;

  setMeta(item: vscode.TestItem, m: ItemMeta): void {
    this.index.setMeta(item, m);
  }
  getMeta(item: vscode.TestItem): ItemMeta | undefined {
    return this.index.getMeta(item);
  }

  setCoverage(uriStr: string, details: vscode.FileCoverageDetail[]): void {
    this.coverageStore.set(uriStr, details);
  }
  getCoverage(uriStr: string): vscode.FileCoverageDetail[] {
    return this.coverageStore.get(uriStr);
  }
  clearCoverage(): void {
    this.coverageStore.clear();
  }
  get coverageSize(): number {
    return this.coverageStore.size;
  }

  extraReporter?: string;
  setExtraReporter(name: string): void {
    this.extraReporter = name;
  }
  consumeExtraReporter(): string | undefined {
    const r = this.extraReporter;
    this.extraReporter = undefined;
    return r;
  }

  // ── Persistência do último resultado (PRD-56/PRD-139) ─────────────────

  attachMemento(memento: vscode.Memento): void {
    this.snapshot.attachMemento(memento);
  }
  persist(): void {
    this.snapshot.persist();
  }
  restore(): number {
    return this.snapshot.restore();
  }

  setLastResults(results: Map<string, TestLineResult>): void {
    this.snapshot.setLastResults(results);
  }
  getLastResults(): Map<string, TestLineResult> {
    return this.snapshot.getLastResults();
  }
  clearLastResults(): void {
    this.snapshot.clearLastResults();
  }
  hasFailedResults(): boolean {
    return this.snapshot.hasFailedResults();
  }

  /**
   * Reconstrói `lastFailedItems` a partir do snapshot, mapeando ids → itens já
   * presentes na árvore. Ids sem item correspondente são ignorados.
   */
  restoreLastFailed(): vscode.TestItem[] {
    const out: vscode.TestItem[] = [];
    for (const [id, r] of this.getLastResults()) {
      if (r.status !== 'failed' && r.status !== 'error') continue;
      const item = this.getItem(id) ?? this.index.findTestByLegacyId(id);
      if (item) out.push(item);
    }
    this.setLastFailedItems(out);
    return out;
  }

  setLastRun(state: import('./stateStore/runSnapshot').LastRunState): void {
    this.snapshot.setLastRun(state);
  }
  getLastRun(): import('./stateStore/runSnapshot').LastRunState | undefined {
    return this.snapshot.getLastRun();
  }
  setLastFailedItems(items: vscode.TestItem[]): void {
    this.snapshot.setLastFailedItems(items);
  }
  getLastFailedItems(): vscode.TestItem[] {
    return this.snapshot.getLastFailedItems();
  }

  setSuiteItem(id: string, item: vscode.TestItem): void {
    this.index.setSuiteItem(id, item);
  }
  getSuiteItem(id: string): vscode.TestItem | undefined {
    return this.index.getSuiteItem(id);
  }
  getSuiteItemFor(packageName: string, schema?: string): vscode.TestItem | undefined {
    return this.index.getSuiteItemFor(packageName, schema);
  }
  findSuiteItemForUri(uri: vscode.Uri, packageName?: string): vscode.TestItem | undefined {
    return this.index.findSuiteItemForUri(uri, packageName);
  }
  clearSuiteMap(): void {
    this.index.clearSuiteMap();
  }

  setItem(id: string, item: vscode.TestItem): void {
    this.index.setItem(id, item);
  }
  getItem(id: string): vscode.TestItem | undefined {
    return this.index.getItem(id);
  }
  clearItemMap(): void {
    this.index.clearItemMap();
  }

  markResolved(id: string): void {
    this.index.markResolved(id);
  }
  isResolved(id: string): boolean {
    return this.index.isResolved(id);
  }
  clearResolved(): void {
    this.index.clearResolved();
  }

  setDiscoveredFiles(files: SuiteFile[]): void {
    this.index.setDiscoveredFiles(files);
  }
  setSchemaSuites(schema: string, suites: SuiteFile[]): void {
    this.index.setSchemaSuites(schema, suites);
  }
  getSchemaSuites(schema: string): SuiteFile[] | undefined {
    return this.index.getSchemaSuites(schema);
  }
  clearSchemaSuites(): void {
    this.index.clearSchemaSuites();
  }
  setSuiteFile(id: string, suite: SuiteFile): void {
    this.index.setSuiteFile(id, suite);
  }
  getSuiteFile(id: string): SuiteFile | undefined {
    return this.index.getSuiteFile(id);
  }
  clearSuiteFiles(): void {
    this.index.clearSuiteFiles();
  }

  removeItemsByUri(uri: string): void {
    this.index.removeItemsByUri(uri);
  }
}

// Reexporta tipos usados por call sites antigos.
export type { TestStatus };
