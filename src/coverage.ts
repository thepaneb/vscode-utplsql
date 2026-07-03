import * as fs from 'node:fs';
import * as path from 'node:path';
import * as vscode from 'vscode';

/**
 * Resolve o filename do relatório para um Uri local existente.
 * Tenta, em ordem: absoluto; relativo à raiz do workspace; relativo a sourcePath.
 */
export function resolveSourceUri(
  file: string,
  workspaceRoot: string,
  sourcePath: string,
): vscode.Uri | undefined {
  const candidates = [
    file,
    path.join(workspaceRoot, file),
    path.join(workspaceRoot, sourcePath, file),
    path.join(workspaceRoot, sourcePath, path.basename(file)),
  ];
  for (const c of candidates) {
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
