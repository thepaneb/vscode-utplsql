// Decodificação de bytes para string no encoding do perfil. PURO (sem 'vscode').
// Sem `iconv-lite`: `utf8`/`win1252` via `TextDecoder` nativo; `latin1` via
// `Buffer.toString('latin1')` (ISO-8859-1 real — `TextDecoder('iso-8859-1')`
// decodificaria como windows-1252 pelo WHATWG). Ausente/inválido → `utf8`.

import type { ProfileCharset } from './types';

const VALID_CHARSETS: ReadonlySet<string> = new Set(['utf8', 'latin1', 'win1252']);

/** Converte bytes em string JS no charset do perfil e remove BOM. */
export function decodeBytes(bytes: Uint8Array, charset?: ProfileCharset): string {
  const normalized = charset && VALID_CHARSETS.has(charset) ? charset : 'utf8';
  if (normalized === 'latin1') {
    // ISO-8859-1 mapeia byte→code point 1:1, então um BOM UTF-8 não vira U+FEFF.
    return Buffer.from(bytes).toString('latin1');
  }
  const label = normalized === 'utf8' ? 'utf-8' : 'windows-1252';
  const text = new TextDecoder(label, { fatal: false }).decode(bytes);
  return text.startsWith('\ufeff') ? text.slice(1) : text;
}
