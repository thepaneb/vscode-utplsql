/**
 * Resolução de aliases TNS para o driver **thin** do node-oracledb (PRD-82).
 * Módulo PURO (sem `vscode`) — testável com `node --test`.
 *
 * O thin não resolve `tnsnames.ora` por conta própria a partir de uma setting:
 * depende de `TNS_ADMIN` no processo. Aqui resolvemos o alias para o descriptor
 * e o entregamos como `connectString`, o que funciona no thin sem mexer em env.
 */

export const TNSNAMES_FILENAME = 'tnsnames.ora';

/**
 * Precedência do diretório TNS (PRD-82 RF1):
 *   1) setting `utplsql.connections.tnsAdminPath`
 *   2) valor **user/machine** de `sqldeveloper.connections.tnsConfiguration.path`
 *   3) variável de ambiente `TNS_ADMIN`
 * Retorna `undefined` quando nenhum está preenchido.
 */
export function resolveTnsAdminPath(
  setting: string | undefined,
  sqlDevPath: string | undefined,
  env: string | undefined,
): string | undefined {
  return setting?.trim() || sqlDevPath?.trim() || env?.trim() || undefined;
}

/** `tnsnames.ora` usa `#` para comentário de linha. */
function stripComments(content: string): string {
  return content.replace(/#[^\n\r]*/g, ' ');
}

/**
 * Um `connectString` que é um alias TNS (e não Easy Connect/TNS alias já opaco):
 * apenas `[A-Za-z][A-Za-z0-9_.$-]*`, sem `@`, `/`, `:`, `(` ou espaço.
 */
export function looksLikeTnsAlias(connectString: string): boolean {
  return /^[A-Za-z][A-Za-z0-9_.$-]*$/.test(connectString.trim());
}

/**
 * Parser de `tnsnames.ora`: mapa `ALIAS (maiúsculo) → descriptor`.
 * Lida com `DESCRIPTION` multilinha (parênteses balanceados) e comentários.
 * `IFILE`/`sqlnet.ora` não são seguidos (fora do escopo — PRD-82).
 */
export function parseTnsnames(content: string): Map<string, string> {
  const map = new Map<string, string>();
  const text = stripComments(content);
  const n = text.length;
  let i = 0;

  while (i < n) {
    while (i < n && /\s/.test(text[i] as string)) i++;
    if (i >= n) break;

    // Nome (até `=` ou whitespace).
    const nameStart = i;
    while (i < n && text[i] !== '=' && !/\s/.test(text[i] as string)) i++;
    const name = text.slice(nameStart, i).trim();
    while (i < n && /\s/.test(text[i] as string)) i++;
    if (text[i] !== '=') {
      // Linha sem `=`: avança para não travar.
      while (i < n && text[i] !== '\n') i++;
      continue;
    }
    i++; // consome `=`
    while (i < n && /\s/.test(text[i] as string)) i++;

    let value: string;
    if (text[i] === '(') {
      // Valor = grupo balanceado (atravessa linhas).
      const start = i;
      let depth = 0;
      for (; i < n; i++) {
        const ch = text[i];
        if (ch === '(') depth++;
        else if (ch === ')') {
          depth--;
          if (depth === 0) {
            i++;
            break;
          }
        }
      }
      value = text.slice(start, i);
    } else {
      const start = i;
      while (i < n && !/\s/.test(text[i] as string)) i++;
      value = text.slice(start, i);
    }

    if (name) map.set(name.toUpperCase(), value.trim());
  }

  return map;
}

/** Resolve um alias (case-insensitive) no conteúdo de `tnsnames.ora`. */
export function resolveTnsAlias(content: string, alias: string): string | undefined {
  return parseTnsnames(content).get(alias.trim().toUpperCase());
}
