/**
 * Store de cobertura por URI com teto LRU (PRD-139 RF1).
 * Módulo PURO em runtime (só tipos de `vscode`).
 */

import type * as vscode from 'vscode';
import { LruMap } from '../lru';

export const COVERAGE_STORE_MAX_ENTRIES = 500;

export class CoverageStore {
  private readonly store = new LruMap<string, vscode.FileCoverageDetail[]>(
    COVERAGE_STORE_MAX_ENTRIES,
  );

  set(uri: string, details: vscode.FileCoverageDetail[]): void {
    this.store.set(uri, details);
  }

  get(uri: string): vscode.FileCoverageDetail[] {
    return this.store.get(uri) ?? [];
  }

  clear(): void {
    this.store.clear();
  }

  get size(): number {
    return this.store.size;
  }
}
