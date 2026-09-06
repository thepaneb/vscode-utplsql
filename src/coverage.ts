import * as fs from 'node:fs';
import * as path from 'node:path';
import * as vscode from 'vscode';

/**
 * Resolve o filename do relatório para um Uri local existente.
 * Tenta, em ordem: folderRoot (se fornecido); workspaceRoot; sourcePath.
 * Nunca sai da raiz do workspace (mitiga path traversal via coverage XML).
 */
export function resolveSourceUri(
  file: string,
  workspaceRoot: string,
  sourcePath: string,
  folderRoot?: string,
): vscode.Uri | undefined {
  const isInside = (c: string, base: string): boolean => {
    const rc = path.resolve(c);
    const rb = path.resolve(base);
    const prefix = rb.endsWith(path.sep) ? rb : `${rb}${path.sep}`;
    return rc === rb || rc.startsWith(prefix);
  };

  const candidates: string[] = [];
  const push = (base: string) => {
    candidates.push(
      file,
      path.join(base, file),
      path.join(base, sourcePath, file),
      path.join(base, sourcePath, path.basename(file)),
    );
  };
  if (folderRoot) push(folderRoot);
  push(workspaceRoot);

  const seen = new Set<string>();
  for (const c of candidates) {
    if (seen.has(c)) continue;
    seen.add(c);
    const insideRoot = folderRoot
      ? isInside(c, folderRoot) || isInside(c, workspaceRoot)
      : isInside(c, workspaceRoot);
    if (!insideRoot) continue;
    try {
      if (fs.existsSync(c) && fs.statSync(c).isFile()) {
        return vscode.Uri.file(c);
      }
    } catch {
      /* ignore */
    }
  }
  return undefined;
}
