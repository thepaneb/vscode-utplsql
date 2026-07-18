import type * as vscode from 'vscode';
import type { ItemMeta } from './types';

export class TestStateManager {
  private meta = new WeakMap<vscode.TestItem, ItemMeta>();
  private coverageStore = new Map<string, vscode.FileCoverageDetail[]>();

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
}
