/**
 * Mascaramento/redaction de credenciais de conexão Oracle.
 * Módulo puro (sem `vscode`), reutilizado por `connectionProfiles.ts`,
 * `scriptRunner.ts` e pelo ciclo de conexão do `oracleRunner.ts` (PRD-110).
 */

/**
 * `scott/tiger@localhost:1521/XE` → `scott@localhost:1521/XE`.
 * Cobre também a credencial sem `@` (conexão malformada, ex.: `scott/tiger`,
 * que é justamente o caso que faz `parseConnString` lançar): sem host não há
 * como separar as partes, então corta após o 1º `/`.
 */
export function maskConnection(conn: string): string {
  const at = conn.lastIndexOf('@');
  if (at < 0) {
    const slash = conn.indexOf('/');
    return slash >= 0 ? conn.slice(0, slash) : conn;
  }
  const cred = conn.slice(0, at);
  const slash = cred.indexOf('/');
  const user = slash >= 0 ? cred.slice(0, slash) : cred;
  return `${user}${conn.slice(at)}`;
}

/**
 * Mascara a connection **dentro** de uma mensagem sem heurística: substitui
 * apenas a ocorrência exata da connection conhecida pela versão mascarada.
 * Evita corromper o texto (um `maskConnection(message)` genérico cortava a
 * mensagem no 1º `/` do template i18n).
 */
export function redactConnection(msg: string, connection: string): string {
  if (!connection) return msg;
  const masked = maskConnection(connection);
  if (masked === connection) return msg;
  return msg.split(connection).join(masked);
}
