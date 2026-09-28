import * as vscode from 'vscode';

/**
 * URIs virtuais de fonte do banco (PRD-80). Módulo leve (só `vscode`) para não
 * criar ciclo entre `results.ts` (jump/cobertura) e `dbSourceProvider.ts`.
 *
 * - `utplsql-source:/<SCHEMA>/<OBJ>.<ext>?line=<N>` — qualquer objeto do banco.
 * - `utplsql-db:/<SCHEMA>/<PKG>.pks` — legado: spec da suite (PRD-74).
 */

export const VIRTUAL_SOURCE_SCHEME = 'utplsql-source';
export const LEGACY_DB_SCHEME = 'utplsql-db';

/** Monta a URI virtual do provider (schema opcional). */
export function virtualSourceUri(schema: string, object: string, ext = 'sql'): vscode.Uri {
  const obj = `${object.toUpperCase()}.${ext}`;
  const path = schema ? `${schema.toUpperCase()}/${obj}` : obj;
  return vscode.Uri.parse(`${VIRTUAL_SOURCE_SCHEME}:/${path}`);
}

/**
 * `utplsql-source:/APP/UT_ORDERS.pkb?line=42` →
 * `{ schema: 'APP', object: 'UT_ORDERS', ext: 'pkb', line: 42 }`.
 * Sem schema (`utplsql-source:/UT_ORDERS.sql`), `schema` fica vazio e o provider
 * resolve pelo usuário da conexão.
 */
export function parseSourceUri(uri: vscode.Uri): {
  schema: string;
  object: string;
  ext: string;
  line?: number;
} {
  // Tolera harnesses que não separam `path`/`query` (o stub de teste inclui a
  // query no `path`).
  const rawPath = uri.path ?? '';
  const qIndex = rawPath.indexOf('?');
  const pathPart = qIndex >= 0 ? rawPath.slice(0, qIndex) : rawPath;
  const queryPart =
    uri.query && uri.query.length > 0 ? uri.query : qIndex >= 0 ? rawPath.slice(qIndex + 1) : '';

  const segments = pathPart.split('/').filter(Boolean);
  const last = segments[segments.length - 1] ?? '';
  const dot = last.lastIndexOf('.');
  const object = (dot > 0 ? last.slice(0, dot) : last).toUpperCase();
  const ext = (dot > 0 ? last.slice(dot + 1) : 'sql').toLowerCase();
  const schema = (segments.length >= 2 ? (segments[0] ?? '') : '').toUpperCase();
  const lineParam = new URLSearchParams(queryPart).get('line');
  const line = lineParam ? Number.parseInt(lineParam, 10) : Number.NaN;
  return { schema, object, ext, line: Number.isFinite(line) ? line : undefined };
}
