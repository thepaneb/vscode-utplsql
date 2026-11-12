/**
 * Event bus síncrono e tipado para o ciclo de execução (PRD-128).
 *
 * Módulo PURO (sem `vscode`). Os efeitos colaterais (status bar, decorações,
 * diagnósticos, cobertura) assinam os eventos em vez de serem chamados
 * diretamente pelo orquestrador.
 */

import { logger } from './logger';

export type RunEvent =
  | { type: 'suite:start'; index: number; total: number }
  | {
      type: 'run:start';
      pathArgs: string[];
      coverage: boolean;
      exporting: boolean;
    }
  | {
      type: 'run:complete';
      passed: number;
      failed: number;
      skipped: number;
      errored: number;
      durationMs: number;
    }
  | { type: 'coverage:generated'; generated: boolean }
  | { type: 'coverage:html:written'; path: string }
  | { type: 'run:cancelled'; outcome: 'cancelled' | 'timedOut' }
  | { type: 'run:error'; error: string };

export type RunEventType = RunEvent['type'];
export type RunEventOf<T extends RunEventType> = Extract<RunEvent, { type: T }>;
export type RunEventListener<T extends RunEventType> = (event: RunEventOf<T>) => void;

export interface RunEventBus {
  on<T extends RunEventType>(type: T, listener: RunEventListener<T>): () => void;
  off<T extends RunEventType>(type: T, listener: RunEventListener<T>): void;
  emit(event: RunEvent): void;
  /** Emite e aguarda os listeners assíncronos (ex.: diagnósticos pós-run). */
  emitAsync(event: RunEvent): Promise<void>;
  dispose(): void;
  listenerCount(type: RunEventType): number;
}

type AnyListener = (event: RunEvent) => void | Promise<void>;

export function createRunEventBus(): RunEventBus {
  const listeners = new Map<RunEventType, Set<AnyListener>>();
  let disposed = false;

  const on = <T extends RunEventType>(type: T, listener: RunEventListener<T>): (() => void) => {
    if (disposed) return () => {};
    let set = listeners.get(type);
    if (!set) {
      set = new Set();
      listeners.set(type, set);
    }
    const wrapped = listener as unknown as AnyListener;
    set.add(wrapped);
    return () => off(type, listener);
  };

  const off = <T extends RunEventType>(type: T, listener: RunEventListener<T>): void => {
    const set = listeners.get(type);
    if (!set) return;
    set.delete(listener as unknown as AnyListener);
    if (set.size === 0) listeners.delete(type);
  };

  const snapshot = (type: RunEventType): AnyListener[] => [...(listeners.get(type) ?? [])];

  const emit = (event: RunEvent): void => {
    if (disposed) return;
    for (const listener of snapshot(event.type)) {
      try {
        const result = listener(event);
        if (result && typeof result.catch === 'function') {
          void result.catch((error) => {
            logger.warn('runEvents: listener assíncrono falhou', {
              event: event.type,
              error: String(error),
            });
          });
        }
      } catch (error) {
        logger.warn('runEvents: listener falhou', { event: event.type, error: String(error) });
      }
    }
  };

  const emitAsync = async (event: RunEvent): Promise<void> => {
    if (disposed) return;
    await Promise.allSettled(
      snapshot(event.type).map(async (listener) => {
        try {
          await listener(event);
        } catch (error) {
          logger.warn('runEvents: listener assíncrono falhou', {
            event: event.type,
            error: String(error),
          });
        }
      }),
    );
  };

  return {
    on,
    off,
    emit,
    emitAsync,
    dispose: () => {
      disposed = true;
      listeners.clear();
    },
    listenerCount: (type) => listeners.get(type)?.size ?? 0,
  };
}
