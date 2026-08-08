import type * as vscode from 'vscode';
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
}
