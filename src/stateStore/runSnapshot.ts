/**
 * Snapshot do último run e persistência no `workspaceState` (PRD-56/PRD-139).
 * Módulo PURO em runtime (só tipos de `vscode`).
 */

import type * as vscode from 'vscode';
import { logger } from '../logger';
import {
  PERSIST_KEY,
  PERSIST_MAX_AGE_DAYS,
  PERSIST_MAX_ENTRIES,
  type PersistedResult,
  type PersistedRun,
  type TestLineResult,
  truncateMessage,
} from './persisted';

export interface LastRunState {
  type: 'all' | 'file' | 'suite' | 'test';
  uri?: vscode.Uri;
  packageName?: string;
  procName?: string;
  coverage: boolean;
}

export class RunSnapshot {
  private lastResults = new Map<string, TestLineResult>();
  private lastRun: LastRunState | undefined;
  private lastFailedItems: vscode.TestItem[] = [];
  private memento?: vscode.Memento;

  attachMemento(memento: vscode.Memento): void {
    this.memento = memento;
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
   * Restaura o snapshot do workspace. Formato desconhecido/inválido é
   * descartado silenciosamente. Devolve quantos resultados voltaram.
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

  /** Há resultado `failed`/`error` no snapshot, mesmo sem itens materializados? */
  hasFailedResults(): boolean {
    for (const r of this.lastResults.values()) {
      if (r.status === 'failed' || r.status === 'error') return true;
    }
    return false;
  }
}
