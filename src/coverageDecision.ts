// Decisão de cobertura por execução. PURO (sem 'vscode').
//
// PRD-54: os entry points sem cobertura explícita (runAll/runFile/runAtCursor/
// rerunLast/runByTag e o auto-run) usam o modo global `coverageAlways` da
// sessão; os comandos `*Coverage` forçam `true` explícito e nunca são afetados.

/** Cobertura efetiva: explícito vence; ausente (undefined) segue o modo global. */
export function effectiveCoverage(explicit: boolean | undefined, coverageAlways: boolean): boolean {
  return explicit ?? coverageAlways;
}

export interface CoverageToggleText {
  text: string;
  tooltip: string;
}

/**
 * Texto e tooltip do item de status bar do toggle. O tooltip comunica que é um
 * modo de sessão (não persiste).
 */
export function coverageToggleText(
  on: boolean,
  labels: { on: string; off: string; onTooltip: string; offTooltip: string },
): CoverageToggleText {
  return {
    text: on ? '$(beaker) $(check) Coverage: on' : '$(beaker) Coverage: off',
    tooltip: on ? labels.onTooltip : labels.offTooltip,
  };
}
