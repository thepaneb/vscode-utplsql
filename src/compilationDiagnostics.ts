import * as path from 'node:path';
import * as vscode from 'vscode';
import { readConfig, resolveConnectionNoPrompt } from './config';
import { logger } from './logger';
import { checkCompilationErrors, connectionUser, withOracleConnection } from './oracleRunner';
import type { TestStateManager } from './state';

/**
 * Diagnóstico de compilação PL/SQL via Oracle (PRD-68 RF1).
 * Consulta `ALL_ERRORS` para o schema da conexão e publica no Problems Panel
 * (source "utPLSQL Compilation"), mapeando cada erro para o arquivo de origem
 * (produção) ou para a suite descoberta.
 * Best-effort: nunca lança.
 */
const SOURCE = 'utPLSQL Compilation';
/** Fontes de produção que podem receber diagnóstico (PRD-148 RF3). */
const SOURCE_PATTERN = '**/*.{pks,pkb,typ,tpb,prc,fnc,trg}';
const EXT_BY_TYPE: Record<string, string> = {
  PACKAGE: 'pks',
  'PACKAGE BODY': 'pkb',
  TYPE: 'typ',
  'TYPE BODY': 'tpb',
  FUNCTION: 'fnc',
  PROCEDURE: 'prc',
  TRIGGER: 'trg',
};
let collection: vscode.DiagnosticCollection | undefined;

interface SourceIndex {
  /** nome do objeto (lower) → extensão → Uri. */
  byName: Map<string, Map<string, vscode.Uri>>;
}

export function registerCompilationDiagnostics(context: vscode.ExtensionContext): void {
  collection = vscode.languages.createDiagnosticCollection('utplsql-compilation');
  context.subscriptions.push(collection);
}

export function clearCompilationDiagnostics(): void {
  collection?.clear();
}

function extForType(type: string): string | undefined {
  return EXT_BY_TYPE[type.trim().toUpperCase().replace(/\s+/g, ' ')];
}

/**
 * Indexa as fontes de produção do workspace uma vez por refresh. `findFiles`
 * usa os excludes do workspace e ignora `node_modules`.
 */
async function indexSources(): Promise<SourceIndex> {
  const byName = new Map<string, Map<string, vscode.Uri>>();
  try {
    const uris = await vscode.workspace.findFiles(SOURCE_PATTERN, '**/node_modules/**');
    for (const uri of uris) {
      const base = path.basename(uri.fsPath);
      const dot = base.lastIndexOf('.');
      if (dot <= 0) continue;
      const name = base.slice(0, dot).toLowerCase();
      const ext = base.slice(dot + 1).toLowerCase();
      let byExt = byName.get(name);
      if (!byExt) {
        byExt = new Map();
        byName.set(name, byExt);
      }
      if (!byExt.has(ext)) byExt.set(ext, uri);
    }
  } catch (e) {
    logger.debug('compilationDiagnostics: índice de fontes indisponível', { error: String(e) });
  }
  return { byName };
}

/** Primeira suite descoberta por package (cópias de tag/schema usam a mesma). */
function indexSuites(state: TestStateManager): Map<string, vscode.Uri> {
  const byName = new Map<string, vscode.Uri>();
  for (const item of state.cachedItems) {
    const meta = state.getMeta(item);
    if (meta?.kind !== 'suite' || !meta.uri) continue;
    const key = meta.packageName.toLowerCase();
    if (!byName.has(key)) byName.set(key, meta.uri);
  }
  return byName;
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

      const suites = indexSuites(state);
      const needsSources = errors.some((err) => extForType(err.type) !== undefined);
      const sources: SourceIndex = needsSources ? await indexSources() : { byName: new Map() };

      const byUri = new Map<string, vscode.Diagnostic[]>();
      for (const err of errors) {
        const name = err.name.toLowerCase();
        const ext = extForType(err.type);
        const source = ext ? sources.byName.get(name)?.get(ext) : undefined;
        // Sem arquivo de produção resolvível, mantém o diagnóstico na suite de
        // mesmo nome (ex.: suite só-banco); sem suite, omite.
        const uri = source ?? suites.get(name);
        if (!uri) continue;

        const line = Math.max(0, (err.line || 1) - 1);
        const diag = new vscode.Diagnostic(
          new vscode.Range(line, 0, line, Number.MAX_SAFE_INTEGER),
          `${err.type}: ${err.text}`,
          vscode.DiagnosticSeverity.Error,
        );
        diag.source = SOURCE;
        const key = uri.toString();
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
