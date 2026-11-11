/**
 * Cache do snapshot de configuração (PRD-130 RF1).
 *
 * Módulo PURO (sem `vscode`). A geração é incrementada por qualquer evento que
 * possa mudar o snapshot (settings, perfil ativo, conexão e senha da wallet);
 * `readConfig()` só reconstrói quando a geração muda.
 */

let generation = 0;
let cached: { generation: number; value: unknown } | undefined;

/** Invalida o snapshot; o próximo `readConfig()` reconstrói. */
export function invalidateConfigCache(): void {
  generation += 1;
  cached = undefined;
}

/** Incrementa a geração (usado pelos helpers de teste do stub). */
export function bumpConfigGeneration(): void {
  invalidateConfigCache();
}

export function configGeneration(): number {
  return generation;
}

/** Devolve o valor em cache para a geração atual ou reconstrói. */
export function cachedConfig<T>(build: () => T): T {
  if (cached?.generation === generation) return cached.value as T;
  const value = build();
  cached = { generation, value };
  return value;
}

/** Limpa o cache sem alterar a geração (testes de cache hit/miss). */
export function resetConfigCache(): void {
  cached = undefined;
}
