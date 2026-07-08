import * as fs from 'node:fs';
import * as path from 'node:path';
import * as vscode from 'vscode';

/**
 * Resolve o filename do relatório para um Uri local existente.
 * Tenta, em ordem: folderRoot (se fornecido); workspaceRoot; sourcePath.
 */
export function resolveSourceUri(
  file: string,
  workspaceRoot: string,
  sourcePath: string,
  folderRoot?: string,
): vscode.Uri | undefined {
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
