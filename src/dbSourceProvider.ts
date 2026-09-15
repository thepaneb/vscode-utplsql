import * as vscode from 'vscode';
import { readConfig, resolveConnectionNoPrompt } from './config';
import { ensurePool, parseConnString } from './oracleRunner';

/**
 * Provider read-only do scheme virtual `utplsql-db:/<SCHEMA>/<PKG>.pks`.
 * Permite que o "Go to Error" abra suites descobertas apenas no banco
 * (fonte lida de ALL_SOURCE), já que não existe arquivo físico no workspace.
 */
const cache = new Map<string, string>();

function cell(row: unknown, key: string): string {
  if (Array.isArray(row)) return String(row[0] ?? '');
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

export async function fetchDbSource(uri: vscode.Uri): Promise<string> {
  const { schema, pkg } = parseDbSourceUri(uri);
  if (!schema || !pkg) return '';

  const connStr = resolveConnectionNoPrompt();
  if (!connStr) return '';

  let oracledb: typeof import('oracledb');
  try {
    const mod = await import('oracledb');
    oracledb =
      ((mod as Record<string, unknown>).default as typeof import('oracledb')) ??
      (mod as typeof import('oracledb'));
  } catch {
    return '';
  }

  const cfg = readConfig();
  const pool = await ensurePool(oracledb, connStr, cfg).catch(() => undefined);
  let conn: import('oracledb').Connection;
  try {
    conn = pool
      ? await pool.getConnection()
      : await oracledb.getConnection(parseConnString(connStr));
  } catch {
    return '';
  }

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
  } finally {
    await conn.close().catch(() => {});
  }
}

export function registerDbSourceProvider(context: vscode.ExtensionContext): void {
  const provider: vscode.TextDocumentContentProvider = {
    async provideTextDocumentContent(uri: vscode.Uri): Promise<string> {
      const key = uri.toString();
      const cached = cache.get(key);
      if (cached !== undefined) return cached;
      const text = await fetchDbSource(uri);
      cache.set(key, text);
      return text;
    },
  };
  context.subscriptions.push(
    vscode.workspace.registerTextDocumentContentProvider('utplsql-db', provider),
  );
}

/** Limpa o cache do provider (ex.: após refresh da árvore). */
export function clearDbSourceCache(): void {
  cache.clear();
}
