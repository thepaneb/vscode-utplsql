// Detecção de suporte a caracteres fora do básico (ex.: €) por bancos Oracle
// com charset legado. PURO (sem 'vscode') — testável com `node --test`.
//
// Motivação (PRD-84): o node-oracledb thin usa sempre AL32UTF8 e ignora o
// `NLS_LANG`; quem converte é o servidor. Em bancos com `NLS_CHARACTERSET`
// legado (ex.: o 12.2 da imagem Oracle, WE8DEC), caracteres não representáveis
// são perdidos (o `€` vira `¿`). A extensão não consegue corrigir isso no
// cliente; os testes de integração devem detectar e *skipar* com motivo.

/**
 * Interpreta o `DUMP(:v)` do Oracle para `€` e diz se o caractere foi
 * preservado (bytes UTF-8 `E2 82 AC`). Aceita o retorno em array ou string,
 * tolerando formatos como `Typ=1 Len=3: 226,130,172`.
 */
export function euroPreservedFromDump(dump: unknown): boolean {
  const text = Array.isArray(dump) ? String(dump?.[0] ?? '') : String(dump ?? '');
  const m = text.match(/len=(\d+):\s*([0-9,\s]+)/i);
  if (!m) return false;
  const len = Number.parseInt(m[1], 10);
  const bytes = m[2]
    .split(',')
    .map((b) => Number.parseInt(b, 10))
    .filter((n) => Number.isFinite(n));
  // UTF-8 de '€' = 226,130,172; degradado em WE8DEC = 191 (1 byte).
  return len === 3 && bytes[0] === 226 && bytes[1] === 130 && bytes[2] === 172;
}
