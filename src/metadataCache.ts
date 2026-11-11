/**
 * Cache em memória com TTL para metadados Oracle (PRD-131 RF3/RF8).
 * Módulo PURO (sem `vscode`).
 */

export interface CacheStats {
  hits: number;
  misses: number;
}

interface Entry {
  value: unknown;
  expiresAt: number;
}

export class TtlCache {
  private entries = new Map<string, Entry>();
  private hitCount = 0;
  private missCount = 0;

  constructor(
    private readonly defaultTtlMs: number,
    private readonly now: () => number = () => Date.now(),
  ) {}

  get<T>(key: string): T | undefined {
    const entry = this.entries.get(key);
    if (!entry) {
      this.missCount += 1;
      return undefined;
    }
    if (entry.expiresAt <= this.now()) {
      this.entries.delete(key);
      this.missCount += 1;
      return undefined;
    }
    this.hitCount += 1;
    return entry.value as T;
  }

  set(key: string, value: unknown, ttlMs = this.defaultTtlMs): void {
    this.entries.set(key, { value, expiresAt: this.now() + Math.max(0, ttlMs) });
  }

  delete(key: string): void {
    this.entries.delete(key);
  }

  clear(): void {
    this.entries.clear();
    this.hitCount = 0;
    this.missCount = 0;
  }

  get size(): number {
    return this.entries.size;
  }

  stats(): CacheStats {
    return { hits: this.hitCount, misses: this.missCount };
  }
}

/**
 * Cache compartilhado pelos metadados Oracle (schema UT3, reporters e suites).
 * A chave inclui a connection + escopo para não misturar bancos.
 */
export const oracleMetadataCache = new TtlCache(30_000);

export function clearOracleMetadataCache(): void {
  oracleMetadataCache.clear();
}
