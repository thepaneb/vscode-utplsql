import * as vscode from 'vscode';
import { readConfig, resolveConnectionNoPrompt } from './config';
import { logger } from './logger';
import { checkCompilationErrors, connectionUser, withOracleConnection } from './oracleRunner';
import type { TestStateManager } from './state';

/**
 * Diagnóstico de compilação PL/SQL via Oracle (PRD-68 RF1).
 * Consulta `ALL_ERRORS` para o schema da conexão e publica no Problems Panel
 * (source "utPLSQL Compilation"), mapeando cada erro para a suite descoberta.
 * Best-effort: nunca lança.
 */
const SOURCE = 'utPLSQL Compilation';
let collection: vscode.DiagnosticCollection | undefined;

export function registerCompilationDiagnostics(context: vscode.ExtensionContext): void {
  collection = vscode.languages.createDiagnosticCollection('utplsql-compilation');
  context.subscriptions.push(collection);
}

export function clearCompilationDiagnostics(): void {
  collection?.clear();
}

export async function refreshCompilationDiagnostics(state: TestStateManager): Promise<void> {
  if (!collection) return;
  collection.clear();

  const cfg = readConfig();
  if (!cfg.compilationDiagnosticsEnabled) return;

  const connStr = resolveConnectionNoPrompt();
  if (!connStr) return;
  const schema = connectionUser(connStr);
  if (!schema) return;

  let oracledb: typeof import('oracledb');
  try {
    const mod = await import('oracledb');
    oracledb =
      ((mod as Record<string, unknown>).default as typeof import('oracledb')) ??
      (mod as typeof import('oracledb'));
  } catch {
    return;
  }

  try {
    await withOracleConnection(oracledb, connStr, cfg, async (conn) => {
      const errors = await checkCompilationErrors(conn, schema);
      if (errors.length === 0) return;

      const metas = state.cachedItems.map((i) => state.getMeta(i)).filter(Boolean) as Array<{
        kind: string;
        packageName?: string;
        uri?: vscode.Uri;
      }>;

      const byUri = new Map<string, vscode.Diagnostic[]>();
      for (const err of errors) {
        const meta = metas.find(
          (m) =>
            m.kind === 'suite' &&
            String(m.packageName ?? '').toLowerCase() === err.name.toLowerCase(),
        );
        if (!meta?.uri) continue;
        const line = Math.max(0, (err.line || 1) - 1);
        const diag = new vscode.Diagnostic(
          new vscode.Range(line, 0, line, Number.MAX_SAFE_INTEGER),
          `${err.type}: ${err.text}`,
          vscode.DiagnosticSeverity.Error,
        );
        diag.source = SOURCE;
        const key = meta.uri.toString();
        const list = byUri.get(key) ?? [];
        list.push(diag);
        byUri.set(key, list);
      }
      for (const [key, diags] of byUri) {
        collection?.set(vscode.Uri.parse(key), diags);
      }
    });
  } catch (e) {
    logger.debug('refreshCompilationDiagnostics falhou', { error: String(e) });
  }
}
