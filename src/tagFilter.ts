// Filtro por tag (`%tags`). PURO (sem 'vscode') — PRD-51.
//
// Inclusão simples + prefixo `!` para exclusão; comparação case-insensitive.
// Um item sem tags só é incluído quando não há filtro de inclusão (RNF2),
// preservando o comportamento atual.

export interface TaggedItem<T> {
  item: T;
  tags: string[] | undefined;
}

/** Separada a seleção do QuickPick em inclusões e exclusões (`!tag`). */
export function parseTagSelection(picked: readonly string[]): {
  include: string[];
  exclude: string[];
} {
  const include: string[] = [];
  const exclude: string[] = [];
  for (const raw of picked) {
    const value = raw.trim();
    if (!value) continue;
    if (value.startsWith('!')) {
      const tag = value.slice(1).trim();
      if (tag) exclude.push(tag);
    } else {
      include.push(value);
    }
  }
  return { include, exclude };
}

function normalize(tags: string[] | undefined): string[] {
  return (tags ?? []).map((t) => t.toLowerCase());
}

/**
 * Filtra itens por tag. `include` (qualquer tag casa) e `exclude` (remove) são
 * case-insensitive; sem `include`, itens sem tag também entram.
 */
export function filterItemsByTags<T>(
  items: TaggedItem<T>[],
  include: readonly string[],
  exclude: readonly string[],
): T[] {
  const inc = include.map((t) => t.toLowerCase());
  const exc = exclude.map((t) => t.toLowerCase());
  const result: T[] = [];
  for (const entry of items) {
    const tags = normalize(entry.tags);
    if (tags.some((t) => exc.includes(t))) continue;
    if (inc.length === 0 || tags.some((t) => inc.includes(t))) {
      result.push(entry.item);
    }
  }
  return result;
}

/** União distinta das tags, ordenada e sem vazios (para o QuickPick). */
export function collectTags(entries: { tags: string[] | undefined }[]): string[] {
  const set = new Set<string>();
  for (const entry of entries) {
    for (const tag of entry.tags ?? []) {
      const value = tag.trim();
      if (value) set.add(value);
    }
  }
  return [...set].sort((a, b) => a.localeCompare(b));
}
