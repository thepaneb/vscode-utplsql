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

/** Mínimo de um workspace folder para os helpers puros (PRD-57). */
export interface FolderLike {
  uri: { fsPath: string };
}

/**
 * Raízes (fsPath) que uma execução precisa cobrir, derivadas dos itens em
 * execução (PRD-57 RF1): o folder de `meta.folder` de cada item, sem repetição e
 * na ordem em que aparecem. Sem nenhuma informação de folder — item sem meta,
 * árvore organizada por arquivo, ou folder desconhecido — devolve **todos** os
 * folders, preservando o comportamento anterior (e o single-root, que resulta
 * numa lista de um elemento só).
 */
export function resolveRunRoots(
  metas: (ItemMeta | undefined)[],
  folders: readonly FolderLike[],
): string[] {
  const known = folders.map((f) => f.uri.fsPath);
  const roots: string[] = [];
  for (const m of metas) {
    const fsPath = m?.folder?.uri.fsPath;
    if (!fsPath || !known.includes(fsPath) || roots.includes(fsPath)) continue;
    roots.push(fsPath);
  }
  return roots.length > 0 ? roots : known;
}
