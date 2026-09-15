/// <reference types="mocha" />
// Helpers compartilhados dos testes de integração (não é um arquivo .test.ts,
// então o `@vscode/test-cli` não o trata como suite).

/**
 * Primeira coluna de uma row, tolerante a `OUT_FORMAT_ARRAY` (array) ou
 * `OUT_FORMAT_OBJECT` (objeto). `oracledb.outFormat` é global e mutado em
 * runtime pela extensão e por outros testes — ler sempre por este helper evita
 * `undefined` silencioso.
 */
export function firstCol(row: unknown): string {
  if (row == null) return '';
  if (Array.isArray(row)) return String(row[0] ?? '');
  const obj = row as Record<string, unknown>;
  return String(Object.values(obj)[0] ?? '');
}

/**
 * Instala `beforeEach`/`afterEach` que salvam e restauram `oracledb.outFormat`,
 * isolando testes que dependem do formato global de rows.
 */
export function installOutFormatIsolation(): void {
  let saved: unknown;
  beforeEach(async () => {
    const mod = await import('oracledb');
    const db = ((mod as Record<string, unknown>).default ?? mod) as typeof import('oracledb');
    saved = db.outFormat;
  });
  afterEach(async () => {
    const mod = await import('oracledb');
    const db = ((mod as Record<string, unknown>).default ?? mod) as typeof import('oracledb');
    db.outFormat = saved as typeof db.outFormat;
  });
}
