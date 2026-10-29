import { logger } from './logger';

/**
 * Identificador Oracle aceito como prefixo de schema (ex.: `UT3.`).
 * O valor descoberto vem de `ALL_SYNONYMS.TABLE_OWNER`, nunca do usuário; a
 * validação é defesa em profundidade antes de concatenar no SQL (PRD-110).
 */
export const SCHEMA_PREFIX_RE = /^[A-Z0-9_$#]+\.$/;

/** `''` (shared install sem prefixo) ou um identificador `OWNER.` válido. */
export function isValidSchemaPrefix(prefix: string): boolean {
  return prefix === '' || SCHEMA_PREFIX_RE.test(prefix);
}

/**
 * Normaliza o prefixo de schema antes de qualquer concatenação.
 * Valor fora do padrão → `''` (sem prefixo), com `warn` sanitizado: o valor
 * cru nunca é ecoado no log.
 */
export function sanitizeSchemaPrefix(prefix: string | null | undefined): string {
  const value = prefix ?? '';
  if (isValidSchemaPrefix(value)) return value;
  logger.warn('sanitizeSchemaPrefix: prefixo de schema inválido ignorado', {
    length: value.length,
  });
  return '';
}
