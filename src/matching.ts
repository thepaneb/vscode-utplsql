import * as path from 'node:path';
import type { ItemMeta } from './types';

const sepRe = /\\/g;

export function filterSuitesByUri(items: ItemMeta[], uriFsPath: string): ItemMeta[] {
  const base = path
    .basename(uriFsPath)
    .replace(/\.(pks|pkb)$/i, '')
    .toLowerCase();
  return items.filter(
    (m) =>
      m.kind === 'suite' &&
      path
        .basename(m.uri.fsPath)
        .replace(/\.(pks|pkb)$/i, '')
        .toLowerCase() === base,
  );
}

export function filterSuitesByFolder(items: ItemMeta[], uriFsPath: string): ItemMeta[] {
  const folder = uriFsPath.toLowerCase().replace(sepRe, '/');
  if (!folder) return [];
  return items.filter(
    (m) =>
      m.kind === 'suite' && m.uri.fsPath.toLowerCase().replace(sepRe, '/').startsWith(`${folder}/`),
  );
}
