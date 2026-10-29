import * as path from 'node:path';
import * as vscode from 'vscode';

/** Contribuição de linguagem de qualquer extensão instalada (inclui a nossa). */
export interface LanguageContribution {
  id?: string;
  extensions?: string[];
  filenames?: string[];
}

/**
 * Identidade canônica: `.pks` sempre participa, independentemente da setting,
 * para não quebrar workspaces existentes que nunca configuraram nada.
 */
const ALWAYS_GLOBS = ['**/*.pks'];

/** Converte uma chave de `files.associations` em glob de workspace. */
export function associationToGlob(key: string): string | undefined {
  const normalized = key.trim().replace(/\\/g, '/');
  if (!normalized) return undefined;
  return normalized.includes('/') ? normalized : `**/${normalized}`;
}

/** Glob → RegExp para casar caminhos normalizados com `/`. */
function globToRegExp(glob: string): RegExp {
  const normalized = glob.replace(/\\/g, '/');
  let out = '';
  for (let i = 0; i < normalized.length; i++) {
    const ch = normalized[i];
    if (ch === '*') {
      if (normalized[i + 1] === '*') {
        if (normalized[i + 2] === '/') {
          out += '(?:.*/)?';
          i += 2;
        } else {
          out += '.*';
          i++;
        }
      } else {
        out += '[^/]*';
      }
    } else if (ch === '?') {
      out += '[^/]';
    } else {
      out += ch.replace(/[.+^${}()|[\]\\]/g, '\\$&');
    }
  }
  return new RegExp(`^${out}$`, 'i');
}

/**
 * Globs efetivos da identidade PL/SQL: extensões/filenames de todas as
 * linguagens configuradas + chaves de `files.associations` que apontam para
 * uma delas. O `.pks` canônico entra sempre.
 */
export function buildLanguageGlobs(
  ids: readonly string[],
  contributions: readonly LanguageContribution[],
  associations: Record<string, string>,
): string[] {
  const wanted = new Set(ids.map((id) => id.trim().toLowerCase()).filter(Boolean));
  const globs = new Set<string>(ALWAYS_GLOBS);

  for (const contribution of contributions) {
    const id = contribution.id?.trim().toLowerCase();
    if (!id || !wanted.has(id)) continue;
    for (const extension of contribution.extensions ?? []) {
      const ext = extension.trim();
      if (!ext) continue;
      globs.add(`**/*${ext.startsWith('.') ? ext : `.${ext}`}`);
    }
    for (const filename of contribution.filenames ?? []) {
      const name = filename.trim();
      if (name) globs.add(`**/${name}`);
    }
  }

  for (const [key, id] of Object.entries(associations ?? {})) {
    if (!id || !wanted.has(id.trim().toLowerCase())) continue;
    const glob = associationToGlob(key);
    if (glob) globs.add(glob);
  }

  return [...globs].sort();
}

/**
 * O arquivo/documento pertence à identidade PL/SQL? Usa o language ID quando
 * disponível e, como fallback, as extensões contribuídas e `files.associations`.
 */
export function matchesLanguageIdentity(
  fileName: string,
  languageId: string | undefined,
  ids: readonly string[],
  contributions: readonly LanguageContribution[],
  associations: Record<string, string>,
): boolean {
  const wanted = new Set(ids.map((id) => id.trim().toLowerCase()).filter(Boolean));
  if (languageId && wanted.has(languageId.toLowerCase())) return true;

  const normalized = fileName.replace(/\\/g, '/');
  const baseName = path.posix.basename(normalized);
  for (const glob of ALWAYS_GLOBS) {
    const re = globToRegExp(glob);
    if (re.test(normalized) || re.test(baseName)) return true;
  }

  const extension = path.extname(normalized).toLowerCase();
  for (const contribution of contributions) {
    const id = contribution.id?.trim().toLowerCase();
    if (!id || !wanted.has(id)) continue;
    if ((contribution.extensions ?? []).some((e) => e.toLowerCase() === extension)) return true;
    if (
      (contribution.filenames ?? []).some(
        (name) => name.trim().toLowerCase() === baseName.toLowerCase(),
      )
    ) {
      return true;
    }
  }

  for (const [key, id] of Object.entries(associations ?? {})) {
    if (!id || !wanted.has(id.trim().toLowerCase())) continue;
    const glob = associationToGlob(key);
    if (!glob) continue;
    const re = globToRegExp(glob);
    if (re.test(normalized) || re.test(baseName)) return true;
  }

  return false;
}

/** Seletor do CodeLens: glob canônico + globs efetivos + language IDs. */
export function buildLanguageSelector(
  ids: readonly string[],
  contributions: readonly LanguageContribution[],
  associations: Record<string, string>,
): vscode.DocumentSelector {
  const filters: vscode.DocumentFilter[] = [];
  const seen = new Set<string>();
  const push = (filter: vscode.DocumentFilter): void => {
    const key = JSON.stringify(filter);
    if (seen.has(key)) return;
    seen.add(key);
    filters.push(filter);
  };

  push({ scheme: 'file', pattern: '**/*.pks' });
  for (const glob of buildLanguageGlobs(ids, contributions, associations)) {
    if (glob === '**/*.pks') continue;
    push({ scheme: 'file', pattern: glob });
  }
  for (const id of ids) {
    const normalized = id.trim();
    if (normalized) push({ scheme: 'file', language: normalized });
  }

  return filters;
}

/** Glob único do watcher com as extensões/filenames efetivos. */
export function buildWatcherGlob(
  ids: readonly string[],
  contributions: readonly LanguageContribution[],
  associations: Record<string, string>,
): string {
  const extensions = new Set<string>(['pks', 'pkb']);
  const names = new Set<string>();

  for (const glob of buildLanguageGlobs(ids, contributions, associations)) {
    const extension = /^\*\*\/\*\.([A-Za-z0-9_]+)$/.exec(glob);
    if (extension) {
      extensions.add(extension[1]);
      continue;
    }
    if (glob.startsWith('**/')) names.add(glob.slice(3));
  }

  const parts = [...extensions].sort();
  for (const name of [...names].sort()) parts.push(name);
  return `**/*.{${parts.join(',')}}`;
}

/** Contribuições de linguagem de todas as extensões instaladas. */
export function currentLanguageContributions(): LanguageContribution[] {
  const out: LanguageContribution[] = [];
  for (const extension of vscode.extensions.all) {
    const languages = (
      extension.packageJSON as { contributes?: { languages?: unknown } } | undefined
    )?.contributes?.languages;
    if (!Array.isArray(languages)) continue;
    for (const language of languages) {
      if (language && typeof language === 'object') {
        out.push(language as LanguageContribution);
      }
    }
  }
  return out;
}

/**
 * `files.associations` efetivas. A configuração é window-scoped no VS Code
 * (não aceita escopo por folder), então uma única leitura vale para o
 * workspace inteiro, inclusive multi-root.
 */
export function workspaceAssociations(): Record<string, string> {
  const value = vscode.workspace
    .getConfiguration('files')
    .get<Record<string, string>>('associations', {});
  return value && typeof value === 'object' ? value : {};
}

/**
 * O documento pertence à identidade PL/SQL configurada? Usado por comandos que
 * operam no editor (Run/Debug at Cursor), não apenas por `.pks`.
 */
export function isPlsqlDocument(
  document: Pick<vscode.TextDocument, 'fileName' | 'languageId'>,
  ids: readonly string[],
): boolean {
  return matchesLanguageIdentity(
    document.fileName,
    document.languageId,
    ids,
    currentLanguageContributions(),
    workspaceAssociations(),
  );
}
