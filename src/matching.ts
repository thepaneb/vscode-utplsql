import * as path from 'node:path';
import type * as vscode from 'vscode';
import type { ItemMeta } from './types';

const sepRe = /\\/g;

export interface MatchEntry {
  item: vscode.TestItem;
  meta: ItemMeta;
}

export function buildMatchIndex(entries: MatchEntry[]): Map<string, vscode.TestItem> {
  const index = new Map<string, vscode.TestItem>();
  for (const { item, meta } of entries) {
    if (meta.kind !== 'test') continue;
    const pkg = meta.packageName.toLowerCase();
    index.set(`${pkg}|${meta.procName.toLowerCase()}`, item);
    index.set(`${pkg}|${meta.description.toLowerCase().trim()}`, item);
  }
  return index;
}

export function findByNameOnly(entries: MatchEntry[], name: string): vscode.TestItem | undefined {
  const lower = name.toLowerCase().trim();
  for (const { item, meta } of entries) {
    if (meta.kind !== 'test') continue;
    if (meta.procName.toLowerCase() === lower || meta.description.toLowerCase().trim() === lower) {
      return item;
    }
  }
  return undefined;
}

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
  const folder = uriFsPath.toLowerCase().replace(sepRe, '/').replace(/\/+$/, '');
  if (!folder) return [];
  const prefix = `${folder}/`;
  return items.filter(
    (m) => m.kind === 'suite' && m.uri.fsPath.toLowerCase().replace(sepRe, '/').startsWith(prefix),
  );
}
