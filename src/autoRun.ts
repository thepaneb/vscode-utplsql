// Auto-run on save (watch mode) — PURO (sem 'vscode'), PRD-50.
//
// Mantém um debounce por arquivo (mapa `uri -> timer`) para coalescer saves
// rápidos do mesmo arquivo sem cancelar arquivos distintos, e a guarda de
// concorrência: se já há execução em andamento, aplica a política de fila
// (`skip` ignora; `replace` agenda a próxima).

export type AutoRunQueuePolicy = 'skip' | 'replace';

export interface AutoRunOptions {
  /** `off` não agenda nada. */
  enabled: boolean;
  /** Delay do debounce por arquivo (ms). */
  delayMs: number;
  /** Política quando há execução em andamento. */
  queue: AutoRunQueuePolicy;
}

export interface AutoRunDeps {
  /** Executa o arquivo (mesma semântica de "Run Test File"). */
  run(uri: string): void | Promise<void>;
  /** Há execução em andamento? Avaliado no momento do disparo. */
  isRunning(): boolean;
  setTimeout: (fn: () => void, ms: number) => ReturnType<typeof setTimeout>;
  clearTimeout: (handle: ReturnType<typeof setTimeout>) => void;
  /** Normalização/validação do arquivo (`.pks` do workspace). */
  isEligible?(uri: string): boolean;
}

export interface AutoRunner {
  /** Agenda a execução do arquivo salvo (após o debounce). */
  schedule(uri: string): void;
  /** Cancela timers pendentes de um arquivo (ou todos). */
  cancel(uri?: string): void;
  readonly pending: number;
}

export function createAutoRunner(getOptions: () => AutoRunOptions, deps: AutoRunDeps): AutoRunner {
  const timers = new Map<string, ReturnType<typeof setTimeout>>();
  const deferred = new Set<string>();

  const fire = (uri: string): void => {
    if (deps.isRunning()) {
      // Guarda de concorrência (RF4): skip descarta; replace reagenda.
      if (getOptions().queue === 'replace') deferred.add(uri);
      return;
    }
    deferred.delete(uri);
    void deps.run(uri);
  };

  return {
    schedule(uri: string): void {
      const opts = getOptions();
      if (!opts.enabled) return;
      if (deps.isEligible && !deps.isEligible(uri)) return;

      const existing = timers.get(uri);
      if (existing !== undefined) deps.clearTimeout(existing);
      const handle = deps.setTimeout(
        () => {
          timers.delete(uri);
          fire(uri);
        },
        Math.max(0, opts.delayMs),
      );
      timers.set(uri, handle);
    },
    cancel(uri?: string): void {
      if (uri === undefined) {
        for (const handle of timers.values()) deps.clearTimeout(handle);
        timers.clear();
        return;
      }
      const handle = timers.get(uri);
      if (handle !== undefined) {
        deps.clearTimeout(handle);
        timers.delete(uri);
      }
    },
    get pending(): number {
      return timers.size;
    },
  };
}
