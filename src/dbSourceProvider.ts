import * as vscode from 'vscode';
import { readConfig, resolveConnectionNoPrompt } from './config';
import { ensurePool, parseConnString } from './oracleRunner';
import { LEGACY_DB_SCHEME, parseSourceUri, VIRTUAL_SOURCE_SCHEME } from './virtualSource';

export {
  LEGACY_DB_SCHEME,
  parseSourceUri,
  VIRTUAL_SOURCE_SCHEME,
  virtualSourceUri,
} from './virtualSource';

/**
 * Provider read-only de fonte do banco (PRD-80).
 *
 * - `utplsql-db:/<SCHEMA>/<PKG>.pks` — compatibilidade: spec da suite descoberta
 *   só no banco (PRD-74).
 * - `utplsql-source:/<SCHEMA>/<OBJ>.<ext>?line=<N>` — qualquer objeto do banco
 *   (package/body, procedure, function, trigger, type/body, view), usado como
 *   fallback de jump-to-failure e de cobertura quando não há arquivo local.
 *
 * Tudo read-only; nunca grava fora do workspace.
 */
const cache = new Map<string, string>();

function cell(row: unknown, key: string): string {
  if (Array.isArray(row)) return String(row[0] ?? '');
  if (row && typeof row === 'object') return String((row as Record<string, unknown>)[key] ?? '');
  return '';
}

function rowCol(row: unknown, index: number, key: string): string {
  if (Array.isArray(row)) return String(row[index] ?? '');
  if (row && typeof row === 'object') return String((row as Record<string, unknown>)[key] ?? '');
  return '';
}

/** `utplsql-db:/APP/UT_ORDERS.pks` → `{ schema: 'APP', pkg: 'UT_ORDERS' }`. */
export function parseDbSourceUri(uri: vscode.Uri): { schema: string; pkg: string } {
  const segments = uri.path.split('/').filter(Boolean);
  return {
    schema: (segments[0] ?? '').toUpperCase(),
    pkg: (segments[1] ?? '').replace(/\.pks$/i, '').toUpperCase(),
  };
}

type LoadedOracledb = typeof import('oracledb');

async function loadOracledb(): Promise<LoadedOracledb | undefined> {
  try {
    const mod = await import('oracledb');
    return ((mod as Record<string, unknown>).default as LoadedOracledb) ?? (mod as LoadedOracledb);
  } catch {
    return undefined;
  }
}

/** Preferência de tipo: corpo (execução/cob. linha) primeiro, ou spec. */
const BODY_FIRST = [
  'PACKAGE BODY',
  'TYPE BODY',
  'PROCEDURE',
  'FUNCTION',
  'TRIGGER',
  'PACKAGE',
  'TYPE',
  'VIEW',
];
const SPEC_FIRST = [
  'PACKAGE',
  'TYPE',
  'PACKAGE BODY',
  'TYPE BODY',
  'PROCEDURE',
  'FUNCTION',
  'TRIGGER',
  'VIEW',
];

async function withConnection<T>(
  loadOracledbMod: () => Promise<LoadedOracledb | undefined>,
  fn: (conn: import('oracledb').Connection, connStr: string) => Promise<T>,
): Promise<T | undefined> {
  const connStr = resolveConnectionNoPrompt();
  if (!connStr) return undefined;
  const oracledb = await loadOracledbMod();
  if (!oracledb) return undefined;

  const cfg = readConfig();
  const pool = await ensurePool(oracledb, connStr, cfg).catch(() => undefined);
  let conn: import('oracledb').Connection;
  try {
    conn = pool
      ? await pool.getConnection()
      : await oracledb.getConnection(parseConnString(connStr));
  } catch {
    return undefined;
  }
  try {
    return await fn(conn, connStr);
  } finally {
    await conn.close().catch(() => {});
  }
}

/** Fonte da suite (spec) do scheme legado `utplsql-db:` (PRD-74). */
export async function fetchDbSource(
  uri: vscode.Uri,
  loadOracledbMod: () => Promise<LoadedOracledb | undefined> = loadOracledb,
): Promise<string> {
  const { schema, pkg } = parseDbSourceUri(uri);
  if (!schema || !pkg) return '';
  const text = await withConnection(loadOracledbMod, async (conn) => {
    try {
      const result = await conn.execute(
        `SELECT text FROM all_source
         WHERE owner = :schema AND name = :name AND type = 'PACKAGE'
         ORDER BY line`,
        { schema, name: pkg },
      );
      return (result.rows ?? []).map((r) => cell(r, 'TEXT')).join('\n');
    } catch {
      return '';
    }
  });
  return text ?? '';
}

/**
 * Texto de um objeto por tipo (PRD-80): agrupa `ALL_SOURCE` por tipo e devolve
 * o primeiro tipo da ordem que tiver linhas, na ordem de `LINE`.
 */
async function fetchObjectText(
  conn: import('oracledb').Connection,
  owner: string,
  name: string,
  typeOrder: string[],
): Promise<string> {
  let result: { rows?: unknown[] };
  try {
    result = await conn.execute(
      `SELECT type, line, text FROM all_source
       WHERE owner = :owner AND name = :name
       ORDER BY line`,
      { owner, name },
    );
  } catch {
    // ALL_SOURCE inacessível/sem grant (RNF1): fallback silencioso.
    return '';
  }
  const byType = new Map<string, { line: number; text: string }[]>();
  for (const row of result.rows ?? []) {
    const type = rowCol(row, 0, 'TYPE').toUpperCase();
    const line = Number.parseInt(rowCol(row, 1, 'LINE'), 10);
    const text = rowCol(row, 2, 'TEXT');
    if (!type) continue;
    if (!byType.has(type)) byType.set(type, []);
    byType.get(type)?.push({ line: Number.isNaN(line) ? 0 : line, text });
  }
  for (const type of typeOrder) {
    const rows = byType.get(type);
    if (rows && rows.length > 0) {
      return rows
        .sort((a, b) => a.line - b.line)
        .map((r) => r.text)
        .join('\n');
    }
  }
  return '';
}

/** Fonte do objeto virtual `utplsql-source:` (qualquer tipo). */
export async function fetchDbObjectSource(
  uri: vscode.Uri,
  loadOracledbMod: () => Promise<LoadedOracledb | undefined> = loadOracledb,
): Promise<string> {
  const { schema, object, ext } = parseSourceUri(uri);
  if (!object) return '';
  const typeOrder = /^pks$/i.test(ext) ? SPEC_FIRST : BODY_FIRST;
  const text = await withConnection(loadOracledbMod, (conn, connStr) => {
    const owner = schema || parseConnString(connStr).user.toUpperCase();
    return fetchObjectText(conn, owner, object, typeOrder);
  });
  return text ?? '';
}

export function registerDbSourceProvider(context: vscode.ExtensionContext): void {
  const provider: vscode.TextDocumentContentProvider = {
    async provideTextDocumentContent(uri: vscode.Uri): Promise<string> {
      const key = uri.toString();
      const cached = cache.get(key);
      if (cached !== undefined) return cached;
      const text =
        uri.scheme === VIRTUAL_SOURCE_SCHEME
          ? await fetchDbObjectSource(uri)
          : await fetchDbSource(uri);
      cache.set(key, text);
      return text;
    },
  };
  context.subscriptions.push(
    vscode.workspace.registerTextDocumentContentProvider(VIRTUAL_SOURCE_SCHEME, provider),
    vscode.workspace.registerTextDocumentContentProvider(LEGACY_DB_SCHEME, provider),
  );
}

/** Limpa o cache do provider (ex.: após refresh da árvore). */
export function clearDbSourceCache(): void {
  cache.clear();
}
