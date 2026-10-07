import type * as vscode from 'vscode';
import type { SuiteFile } from './discovery';
import type { TestStatus } from './junit';
import type { ItemMeta } from './types';

export interface TestLineResult {
  status: TestStatus;
  message?: string;
}

export interface LastRunState {
  type: 'all' | 'file' | 'suite' | 'test';
  uri?: vscode.Uri;
  packageName?: string;
  procName?: string;
  coverage: boolean;
}

export class TestStateManager {
  private meta = new WeakMap<vscode.TestItem, ItemMeta>();
  private coverageStore = new Map<string, vscode.FileCoverageDetail[]>();
  private lastResults = new Map<string, TestLineResult>();
  private lastRun: LastRunState | undefined;
  private lastFailedItems: vscode.TestItem[] = [];
  private suiteMap = new Map<string, vscode.TestItem>();

  cachedItems: vscode.TestItem[] = [];
  runProfile?: vscode.TestRunProfile;
  coverageProfile?: vscode.TestRunProfile;

  /** Modo global de cobertura da sessão (PRD-54). Não persiste. */
  coverageAlways = false;
  setCoverageAlways(value: boolean): void {
    this.coverageAlways = value;
  }

  setMeta(item: vscode.TestItem, m: ItemMeta): void {
    this.meta.set(item, m);
  }
  getMeta(item: vscode.TestItem): ItemMeta | undefined {
    return this.meta.get(item);
  }

  setCoverage(uriStr: string, details: vscode.FileCoverageDetail[]): void {
    this.coverageStore.set(uriStr, details);
  }
  getCoverage(uriStr: string): vscode.FileCoverageDetail[] {
    return this.coverageStore.get(uriStr) ?? [];
  }
  clearCoverage(): void {
    this.coverageStore.clear();
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

  setLastResults(results: Map<string, TestLineResult>): void {
    this.lastResults = results;
  }
  getLastResults(): Map<string, TestLineResult> {
    return this.lastResults;
  }
  clearLastResults(): void {
    this.lastResults.clear();
  }

  setLastRun(state: LastRunState): void {
    this.lastRun = state;
  }
  getLastRun(): LastRunState | undefined {
    return this.lastRun;
  }
  setLastFailedItems(items: vscode.TestItem[]): void {
    this.lastFailedItems = items;
  }
  getLastFailedItems(): vscode.TestItem[] {
    return this.lastFailedItems;
  }

  setSuiteItem(id: string, item: vscode.TestItem): void {
    this.suiteMap.set(id, item);
  }
  getSuiteItem(id: string): vscode.TestItem | undefined {
    return this.suiteMap.get(id);
  }
  clearSuiteMap(): void {
    this.suiteMap.clear();
  }

  /** Mapa id → item para todos os nós da árvore (file e schema). */
  private itemMap = new Map<string, vscode.TestItem>();
  setItem(id: string, item: vscode.TestItem): void {
    this.itemMap.set(id, item);
  }
  getItem(id: string): vscode.TestItem | undefined {
    return this.itemMap.get(id);
  }
  clearItemMap(): void {
    this.itemMap.clear();
  }

  // ── Resolução lazy da árvore (PRD-75) ────────────────────────────────

  private resolvedNodes = new Set<string>();
  markResolved(id: string): void {
    this.resolvedNodes.add(id);
  }
  isResolved(id: string): boolean {
    return this.resolvedNodes.has(id);
  }
  clearResolved(): void {
    this.resolvedNodes.clear();
  }

  /** Suites descobertas por `discoverWorkspace` (antes da resolução lazy). */
  discoveredFiles: SuiteFile[] = [];
  setDiscoveredFiles(files: SuiteFile[]): void {
    this.discoveredFiles = files;
  }

  private schemaSuites = new Map<string, SuiteFile[]>();
  setSchemaSuites(schema: string, suites: SuiteFile[]): void {
    this.schemaSuites.set(schema, suites);
  }
  getSchemaSuites(schema: string): SuiteFile[] | undefined {
    return this.schemaSuites.get(schema);
  }
  clearSchemaSuites(): void {
    this.schemaSuites.clear();
  }

  private suiteFiles = new Map<string, SuiteFile>();
  setSuiteFile(id: string, suite: SuiteFile): void {
    this.suiteFiles.set(id, suite);
  }
  getSuiteFile(id: string): SuiteFile | undefined {
    return this.suiteFiles.get(id);
  }
  clearSuiteFiles(): void {
    this.suiteFiles.clear();
  }
}
