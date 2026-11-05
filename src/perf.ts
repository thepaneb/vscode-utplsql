// Instrumentação de desempenho opt-in (PRD-102). Módulo puro (sem `vscode`):
// mede fronteiras de fase e serializa uma linha JSON por amostra.

export type PerfPhase = 'discovery' | 'buildTree' | 'run' | 'poll' | 'parseXml';

export interface PerfSample {
  phase: PerfPhase;
  /** Duração em milissegundos (inteiro, nunca negativo). */
  ms: number;
  /** Timestamp da medição (epoch ms). */
  ts: number;
  /** Metadados não sensíveis (contagens, ids de fase, etc.). */
  meta?: Record<string, unknown>;
}

export interface PerfProbe {
  readonly enabled: boolean;
  /** Inicia a fase e devolve um `end()` idempotente. */
  start(phase: PerfPhase): () => void;
  /** Registra uma duração já medida. */
  record(phase: PerfPhase, ms: number, meta?: Record<string, unknown>): void;
}

export interface PerfProbeOptions {
  enabled: boolean;
  sink?: (sample: PerfSample) => void;
  now?: () => number;
}

/** Serializa uma amostra como uma linha JSONL (sem quebras internas). */
export function formatPerfLine(sample: PerfSample): string {
  return JSON.stringify(sample);
}

export function createPerfProbe(options: PerfProbeOptions): PerfProbe {
  const enabled = options.enabled === true;
  const now = options.now ?? (() => Date.now());
  const sink = options.sink;

  const emit = (sample: PerfSample): void => {
    if (!enabled || !sink) return;
    try {
      sink(sample);
    } catch {
      // Instrumentação nunca derruba a operação principal.
    }
  };

  const record = (phase: PerfPhase, ms: number, meta?: Record<string, unknown>): void => {
    if (!enabled) return;
    const safe = Number.isFinite(ms) ? Math.max(0, Math.round(ms)) : 0;
    emit({ phase, ms: safe, ts: now(), ...(meta ? { meta } : {}) });
  };

  return {
    enabled,
    start(phase: PerfPhase): () => void {
      if (!enabled) return () => {};
      const started = now();
      let ended = false;
      return () => {
        if (ended) return;
        ended = true;
        record(phase, now() - started);
      };
    },
    record,
  };
}
