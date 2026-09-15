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
