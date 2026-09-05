// Parser PURO de declarações PL/SQL (PROCEDURE/FUNCTION). Sem 'vscode'.
// Heurística conservadora: suficiente para agregar cobertura por declaração.

export interface PlsqlDeclaration {
  name: string;
  /** Linha 0-based da declaração. */
  line: number;
}

export interface PlsqlDeclarationCoverage extends PlsqlDeclaration {
  executed: boolean;
}

/**
 * Mascara strings `'...'` e comentários (`--` e `/* *\/`) com espaços,
 * preservando quebras de linha (para manter a numeração de linhas).
 */
function maskNonCode(text: string): string {
  const out = text.split('');
  const n = text.length;
  let i = 0;
  while (i < n) {
    const c = text[i];
    const next = text[i + 1];
    if (c === "'") {
      out[i] = ' ';
      i++;
      while (i < n) {
        const cc = text[i];
        if (cc === "'") {
          if (text[i + 1] === "'") {
            // string com aspas duplicadas ('it''s')
            out[i] = ' ';
            out[i + 1] = ' ';
            i += 2;
            continue;
          }
          out[i] = ' ';
          i++;
          break;
        }
        if (cc !== '\n') out[i] = ' ';
        i++;
      }
      continue;
    }
    if (c === '-' && next === '-') {
      while (i < n && text[i] !== '\n') {
        out[i] = ' ';
        i++;
      }
      continue;
    }
    if (c === '/' && next === '*') {
      out[i] = ' ';
      out[i + 1] = ' ';
      i += 2;
      while (i < n) {
        if (text[i] === '*' && text[i + 1] === '/') {
          out[i] = ' ';
          out[i + 1] = ' ';
          i += 2;
          break;
        }
        if (text[i] !== '\n') out[i] = ' ';
        i++;
      }
      continue;
    }
    i++;
  }
  return out.join('');
}

const DECL_RE = /(?<!MEMBER\s)(PROCEDURE|FUNCTION)\s+("(?:[^"]*)"|[A-Za-z_][A-Za-z0-9_#$]*)/gi;

function lineAt(text: string, index: number): number {
  let line = 0;
  for (let i = 0; i < index; i++) {
    if (text[i] === '\n') line++;
  }
  return line;
}

/** Extrai declarações `PROCEDURE`/`FUNCTION` fora de comentários/strings. */
export function parsePlsqlDeclarations(text: string): PlsqlDeclaration[] {
  const code = maskNonCode(text);
  const out: PlsqlDeclaration[] = [];
  for (const m of code.matchAll(DECL_RE)) {
    const name = m[2].replace(/^"|"$/g, '');
    out.push({ name, line: lineAt(code, m.index) });
  }
  return out;
}

/**
 * Agrega os hits de linha (Cobertura, 1-based) por declaração: o escopo de uma
 * declaração vai da sua linha até a próxima declaração (ou fim do arquivo).
 * `executed = true` se qualquer linha do escopo tem hits > 0.
 */
export function deriveDeclarationCoverage(
  text: string,
  fileLines: { line: number; hits: number }[],
): PlsqlDeclarationCoverage[] {
  const decls = parsePlsqlDeclarations(text);
  const hits = fileLines
    .filter((l) => l.hits > 0)
    .map((l) => l.line - 1) // 1-based → 0-based
    .sort((a, b) => a - b);
  return decls.map((d, idx) => {
    const nextLine = idx + 1 < decls.length ? decls[idx + 1].line : Number.MAX_SAFE_INTEGER;
    const executed = hits.some((h) => h >= d.line && h < nextLine);
    return { ...d, executed };
  });
}
