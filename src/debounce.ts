/**
 * Debounce reutilizável (RF4). Módulo puro — testável com `node --test`.
 * O delay é lido a cada `schedule()` para respeitar mudanças de configuração.
 */
export interface Debouncer {
  schedule(): void;
  cancel(): void;
  readonly pending: boolean;
}

export function createDebounced(fn: () => void, getDelayMs: () => number): Debouncer {
  let timer: ReturnType<typeof setTimeout> | undefined;
  return {
    schedule(): void {
      if (timer !== undefined) clearTimeout(timer);
      const delay = Math.max(0, getDelayMs());
      timer = setTimeout(() => {
        timer = undefined;
        fn();
      }, delay);
    },
    cancel(): void {
      if (timer !== undefined) {
        clearTimeout(timer);
        timer = undefined;
      }
    },
    get pending(): boolean {
      return timer !== undefined;
    },
  };
}

/**
 * Debounce por chave (PRD-103): alterações do mesmo URI coalescem, chaves
 * diferentes têm timers independentes. `cancel()` sem chave limpa todos.
 */
export interface PerKeyDebouncer {
  schedule(key: string): void;
  cancel(key?: string): void;
  pending(key: string): boolean;
  readonly size: number;
}

export function createPerKeyDebouncer(
  fn: (key: string) => void,
  getDelayMs: () => number,
): PerKeyDebouncer {
  const timers = new Map<string, ReturnType<typeof setTimeout>>();
  return {
    schedule(key: string): void {
      const existing = timers.get(key);
      if (existing !== undefined) clearTimeout(existing);
      const delay = Math.max(0, getDelayMs());
      timers.set(
        key,
        setTimeout(() => {
          timers.delete(key);
          fn(key);
        }, delay),
      );
    },
    cancel(key?: string): void {
      if (key === undefined) {
        for (const timer of timers.values()) clearTimeout(timer);
        timers.clear();
        return;
      }
      const timer = timers.get(key);
      if (timer !== undefined) clearTimeout(timer);
      timers.delete(key);
    },
    pending(key: string): boolean {
      return timers.has(key);
    },
    get size(): number {
      return timers.size;
    },
  };
}
