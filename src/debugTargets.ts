import type { LastRunState } from './state';
import type { ItemMeta } from './types';

/** Alvo de debug derivado de uma execução anterior (`utplsql.rerunLast`). */
export interface DebugTarget {
  packageName: string;
  procName?: string;
}

/**
 * Monta o alvo de `debugLast` a partir do `LastRunState` (PRD-53):
 * - `test` → package + procedure;
 * - `file`/`suite` → package do arquivo/suite;
 * - `all` (ou sem dados) → `undefined` (o chamador cai no picker).
 */
export function resolveLastRunTarget(lastRun: LastRunState | undefined): DebugTarget | undefined {
  if (!lastRun) return undefined;
  if (lastRun.type === 'test' && lastRun.packageName && lastRun.procName) {
    return { packageName: lastRun.packageName, procName: lastRun.procName };
  }
  if ((lastRun.type === 'file' || lastRun.type === 'suite') && lastRun.packageName) {
    return { packageName: lastRun.packageName };
  }
  return undefined;
}

/**
 * Extrai `{ packageName, procName }` de um `TestItem` cujo `ItemMeta` é de
 * teste, para as variações de debug (PRD-53). Sem meta de teste → `undefined`.
 */
export function targetFromMeta(meta: ItemMeta | undefined): DebugTarget | undefined {
  if (!meta || meta.kind !== 'test') return undefined;
  return { packageName: meta.packageName, procName: meta.procName };
}
