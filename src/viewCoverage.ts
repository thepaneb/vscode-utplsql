import * as fs from 'node:fs';
import * as path from 'node:path';
import * as vscode from 'vscode';
import { readConfig } from './config';
import { ensurePool, parseConnString } from './oracleRunner';
import type { TestStateManager } from './state';

export interface ViewFile {
  uri: vscode.Uri;
}

/** Extrai o nome do objeto de um caminho de view (`views/foo.sql` → `FOO`). */
export function viewNameFromPath(filePath: string): string {
  return path.basename(filePath, path.extname(filePath)).toUpperCase();
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function hasWord(text: string, word: string): boolean {
  const e = escapeRegExp(word);
  return new RegExp(`(?:^|[^A-Z0-9_])${e}(?:[^A-Z0-9_]|$)`).test(text);
}

/**
 * Match: cada view é executada se o nome do objeto (word boundary) aparece
 * em algum SQL_TEXT do V$SQL. PURO — testável por unidade.
 */
export function matchExecutedViews(sqlTexts: string[], viewFiles: ViewFile[]): boolean[] {
  const normalized = sqlTexts.map((s) => s.toUpperCase());
  return viewFiles.map((vf) => {
    const name = viewNameFromPath(vf.uri.fsPath);
    return normalized.some((t) => hasWord(t, name));
  });
}

function walk(dir: string, ext: string, acc: string[]): void {
  let entries: string[];
  try {
    entries = fs.readdirSync(dir);
  } catch {
    return;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry);
    let stat: fs.Stats;
    try {
      stat = fs.statSync(full);
    } catch {
      continue;
    }
    if (stat.isDirectory()) walk(full, ext, acc);
    else if (entry.endsWith(ext)) acc.push(full);
  }
}

/** Descobre arquivos de view sob `<root>/<sourcePath>/views/`. */
export function discoverViewFiles(root: string, sourcePath: string): string[] {
  const viewsDir = path.join(root, sourcePath, 'views');
  const acc: string[] = [];
  walk(viewsDir, '.sql', acc);
  return acc;
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

export interface SqlCoverageOptions {
  connection: string;
  root: string;
  sourcePath: string;
  run: vscode.TestRun;
  state: TestStateManager;
  folders?: readonly vscode.WorkspaceFolder[];
}

/**
 * Rastreia views executadas durante o run via V$SQL e emite cobertura booleana
 * (executada = 100%, não executada = 0%). Best-effort: qualquer falha (sem
 * oracledb, sem acesso a V$SQL, timeout) silencia e mantém o comportamento
 * atual.
 */
export async function applySqlCoverage(options: SqlCoverageOptions): Promise<void> {
  const { connection, root, sourcePath, run, state, folders } = options;
  const files = discoverViewFiles(root, sourcePath);
  if (files.length === 0) return;

  const oracledb = await loadOracledb();
  if (!oracledb) return;

  const cfg = readConfig();
  const pool = await ensurePool(oracledb, connection, cfg).catch(() => undefined);
  let conn: import('oracledb').Connection;
  try {
    conn = pool
      ? await pool.getConnection()
      : await oracledb.getConnection(parseConnString(connection));
  } catch {
    return;
  }

  const prevTimeout = conn.callTimeout;
  try {
    conn.callTimeout = 5000;
    const result = await conn.execute(
      `SELECT sql_text FROM v$sql WHERE command_type = 3 AND executions > 0`,
      {},
    );
    const rows = result.rows ?? [];
    const sqlTexts = rows
      .map((r) => {
        if (Array.isArray(r)) return String(r[0] ?? '');
        return String((r as Record<string, unknown>).SQL_TEXT ?? '');
      })
      .filter(Boolean);

    const viewFiles: ViewFile[] = [];
    for (const f of folders ?? []) {
      if (f.uri.fsPath === root) {
        for (const file of files) viewFiles.push({ uri: vscode.Uri.file(file) });
      } else {
        // multi-root: só as views sob a raiz analisada
        const base = f.uri.fsPath;
        for (const file of files) {
          if (file.startsWith(base)) viewFiles.push({ uri: vscode.Uri.file(file) });
        }
      }
    }
    if (viewFiles.length === 0) {
      for (const file of files) viewFiles.push({ uri: vscode.Uri.file(file) });
    }

    const executed = matchExecutedViews(sqlTexts, viewFiles);

    for (let i = 0; i < viewFiles.length; i++) {
      const uri = viewFiles[i].uri;
      const lines = readLines(uri.fsPath);
      if (lines.length === 0) continue;
      const details: vscode.FileCoverageDetail[] = lines.map(
        (_l, idx) => new vscode.StatementCoverage(executed[i] ? 1 : 0, new vscode.Position(idx, 0)),
      );
      const fc = vscode.FileCoverage.fromDetails(uri, details);
      state.setCoverage(uri.toString(), details);
      run.addCoverage(fc);
    }
  } catch {
    /* best-effort: silencia */
  } finally {
    conn.callTimeout = prevTimeout;
    await conn.close().catch(() => {});
  }
}

function readLines(filePath: string): string[] {
  try {
    const text = fs.readFileSync(filePath, 'utf-8');
    return text.split(/\r?\n/).filter((l) => l.length > 0);
  } catch {
    return [];
  }
}
