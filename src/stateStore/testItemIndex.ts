/**
 * Índice de itens, suítes e resolução lazy da árvore (PRD-139 RF2).
 * Módulo PURO em runtime (só tipos de `vscode`).
 */

import type * as vscode from 'vscode';
import type { SuiteFile } from '../discovery';
import type { ItemMeta } from '../types';

export class TestItemIndex {
  private readonly meta = new WeakMap<vscode.TestItem, ItemMeta>();
  private readonly suiteMap = new Map<string, vscode.TestItem>();
  private readonly itemMap = new Map<string, vscode.TestItem>();
  private readonly resolvedNodes = new Set<string>();
  private readonly schemaSuites = new Map<string, SuiteFile[]>();
  private readonly suiteFiles = new Map<string, SuiteFile>();

  /** Suites descobertas por `discoverWorkspace` (antes da resolução lazy). */
  discoveredFiles: SuiteFile[] = [];
  cachedItems: vscode.TestItem[] = [];

  setMeta(item: vscode.TestItem, m: ItemMeta): void {
    this.meta.set(item, m);
  }
  getMeta(item: vscode.TestItem): ItemMeta | undefined {
    return this.meta.get(item);
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

  getSuiteItemFor(packageName: string, schema?: string): vscode.TestItem | undefined {
    const pkg = packageName.toLowerCase();
    if (schema) {
      const exact = this.suiteMap.get(`suite:${schema}:${pkg}`);
      if (exact) return exact;
    }
    return this.suiteMap.get(`suite:${pkg}`);
  }

  findSuiteItemForUri(uri: vscode.Uri, packageName?: string): vscode.TestItem | undefined {
    const target = uri.fsPath.replace(/\\/g, '/').toLowerCase();
    for (const item of this.suiteMap.values()) {
      const meta = this.getMeta(item);
      if (meta?.kind !== 'suite') continue;
      if (packageName && meta.packageName.toLowerCase() !== packageName.toLowerCase()) continue;
      if (meta.uri.fsPath.replace(/\\/g, '/').toLowerCase() === target) return item;
    }
    return packageName ? this.getSuiteItemFor(packageName) : undefined;
  }

  setItem(id: string, item: vscode.TestItem): void {
    this.itemMap.set(id, item);
  }
  getItem(id: string): vscode.TestItem | undefined {
    return this.itemMap.get(id);
  }
  clearItemMap(): void {
    this.itemMap.clear();
  }

  markResolved(id: string): void {
    this.resolvedNodes.add(id);
  }
  isResolved(id: string): boolean {
    return this.resolvedNodes.has(id);
  }
  clearResolved(): void {
    this.resolvedNodes.clear();
  }

  setDiscoveredFiles(files: SuiteFile[]): void {
    this.discoveredFiles = files;
  }

  setSchemaSuites(schema: string, suites: SuiteFile[]): void {
    this.schemaSuites.set(schema, suites);
  }
  getSchemaSuites(schema: string): SuiteFile[] | undefined {
    return this.schemaSuites.get(schema);
  }
  clearSchemaSuites(): void {
    this.schemaSuites.clear();
  }

  setSuiteFile(id: string, suite: SuiteFile): void {
    this.suiteFiles.set(id, suite);
  }
  getSuiteFile(id: string): SuiteFile | undefined {
    return this.suiteFiles.get(id);
  }
  clearSuiteFiles(): void {
    this.suiteFiles.clear();
  }

  /**
   * Resolve um id de resultado antigo (`test:<pkg>.<proc>`) por package/proc
   * (PRD-148 RF4/RF7).
   */
  findTestByLegacyId(id: string): vscode.TestItem | undefined {
    if (!id.startsWith('test:')) return undefined;
    const base = id.slice('test:'.length).split('#')[0] ?? '';
    const dot = base.indexOf('.');
    if (dot <= 0) return undefined;
    const packagePart = base.slice(0, dot);
    const pkg = packagePart.slice(packagePart.lastIndexOf(':') + 1).toLowerCase();
    const proc = base.slice(dot + 1).toLowerCase();
    for (const [, item] of this.itemMap) {
      const meta = this.getMeta(item);
      if (meta?.kind !== 'test') continue;
      if (meta.packageName.toLowerCase() === pkg && meta.procName.toLowerCase() === proc)
        return item;
    }
    return undefined;
  }

  /**
   * Remove dos mapas os itens/suites de um URI (PRD-103 incremental). O nó do
   * controller é removido pelo refresher; aqui fica o estado compartilhado.
   */
  removeItemsByUri(uri: string): void {
    for (const [id, item] of this.itemMap) {
      if (this.meta.get(item)?.uri?.toString() === uri) {
        this.itemMap.delete(id);
        this.resolvedNodes.delete(id);
      }
    }
    for (const [id, item] of this.suiteMap) {
      if (this.meta.get(item)?.uri?.toString() === uri) this.suiteMap.delete(id);
    }
    for (const [id, suite] of this.suiteFiles) {
      if (suite.uri.toString() === uri) this.suiteFiles.delete(id);
    }
    this.cachedItems = this.cachedItems.filter(
      (item) => this.meta.get(item)?.uri?.toString() !== uri,
    );
  }
}
