import type * as vscode from 'vscode';
import type { SuiteFile } from './discovery';
import type { TestStatus } from './junit';
import { logger } from './logger';
import type { ItemMeta } from './types';

export interface TestLineResult {
  status: TestStatus;
  message?: string;
  /** Duração do teste (ms), quando o reporter informa (PRD-56). */
  durationMs?: number;
  /** Timestamp do resultado (ms) — PRD-56. */
  ts?: number;
}

/** Resultado serializável de um teste no snapshot do último run (PRD-56). */
export interface PersistedResult {
  status: TestStatus;
  message?: string;
  durationMs?: number;
  ts: number;
}

/** Snapshot do último run gravado no `workspaceState`. `v` versiona o formato. */
export interface PersistedRun {
  v: 1;
  ts: number;
  items: Record<string, PersistedResult>;
}

/** Chave do snapshot — por workspace, então outro workspace não vê (PRD-56 RNF2). */
export const PERSIST_KEY = 'utplsql.lastRunSnapshot';
/** Teto de caracteres por mensagem persistida (PRD-56 RNF1). */
export const PERSIST_MESSAGE_LIMIT = 500;
/** Máximo de resultados mantidos no snapshot (PRD-131 RF4). */
export const PERSIST_MAX_ENTRIES = 2000;
/** Idade máxima de um resultado persistido (PRD-131 RF4). */
export const PERSIST_MAX_AGE_DAYS = 7;

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

/** Trunca mensagens longas antes de persistir (PRD-56 RNF1). */
export function truncateMessage(message: string, limit = PERSIST_MESSAGE_LIMIT): string {
  return message.length <= limit ? message : `${message.slice(0, limit)}…`;
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

  // ── Persistência do último resultado (PRD-56) ─────────────────────────

  private memento?: vscode.Memento;

  /**
   * Recebe o `Memento` por **setter** (não pelo construtor): evita mexer na
   * assinatura usada por toda a suíte de testes.
   */
  attachMemento(memento: vscode.Memento): void {
    this.memento = memento;
  }

  /** Grava o snapshot do último run (chamado ao fim de cada execução). */
  persist(): void {
    if (!this.memento) return;
    const now = Date.now();
    const maxAgeMs = PERSIST_MAX_AGE_DAYS * 24 * 60 * 60 * 1000;
    const recent = [...this.lastResults]
      .filter(([, result]) => now - (result.ts ?? now) <= maxAgeMs)
      .sort(([, a], [, b]) => (b.ts ?? 0) - (a.ts ?? 0))
      .slice(0, PERSIST_MAX_ENTRIES);
    const items: Record<string, PersistedResult> = {};
    for (const [id, r] of recent) {
      items[id] = {
        status: r.status,
        ...(r.message ? { message: truncateMessage(r.message) } : {}),
        ...(r.durationMs !== undefined ? { durationMs: r.durationMs } : {}),
        ts: r.ts ?? now,
      };
    }
    const snapshot: PersistedRun = { v: 1, ts: now, items };
    Promise.resolve(this.memento.update(PERSIST_KEY, snapshot)).catch((e) => {
      logger.warn('state.persist: falha ao gravar o snapshot', { error: String(e) });
    });
  }

  /**
   * Restaura o snapshot do workspace. Formato desconhecido/ inválido é
   * descartado silenciosamente (RF1/RNF2). Devolve quantos resultados voltaram.
   */
  restore(): number {
    const raw = this.memento?.get<PersistedRun>(PERSIST_KEY);
    if (raw?.v !== 1 || !raw.items) return 0;
    const map = new Map<string, TestLineResult>();
    for (const [id, r] of Object.entries(raw.items)) {
      if (!r || typeof r.ts !== 'number' || !r.status) continue;
      map.set(id, {
        status: r.status,
        ...(r.message ? { message: r.message } : {}),
        ...(r.durationMs !== undefined ? { durationMs: r.durationMs } : {}),
        ts: r.ts,
      });
    }
    this.lastResults = map;
    return map.size;
  }

  /**
   * Reconstrói `lastFailedItems` a partir do snapshot, mapeando ids → itens já
   * presentes na árvore (só faz sentido **depois** do primeiro refresh).
   * Ids sem item correspondente são ignorados (teste removido).
   */
  restoreLastFailed(): vscode.TestItem[] {
    const out: vscode.TestItem[] = [];
    for (const [id, r] of this.lastResults) {
      if (r.status !== 'failed' && r.status !== 'error') continue;
      const item = this.getItem(id) ?? this.findTestByLegacyId(id);
      if (item) out.push(item);
    }
    this.lastFailedItems = out;
    return out;
  }

  /** Há resultado `failed`/`error` no snapshot, mesmo sem itens materializados? */
  hasFailedResults(): boolean {
    for (const r of this.lastResults.values()) {
      if (r.status === 'failed' || r.status === 'error') return true;
    }
    return false;
  }

  /**
   * Resolve um id de resultado antigo (`test:<pkg>.<proc>`) ou de outro schema
   * para o item atual por package/proc (PRD-148 RF4/RF7).
   */
  private findTestByLegacyId(id: string): vscode.TestItem | undefined {
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

  /** Lookup por package com schema opcional (modo schema — PRD-148 RF7). */
  getSuiteItemFor(packageName: string, schema?: string): vscode.TestItem | undefined {
    const pkg = packageName.toLowerCase();
    if (schema) {
      const exact = this.suiteMap.get(`suite:${schema}:${pkg}`);
      if (exact) return exact;
    }
    return this.suiteMap.get(`suite:${pkg}`);
  }

  /** Lookup pelo URI do arquivo, desambiguando owners no modo schema. */
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
