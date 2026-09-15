import * as fs from 'node:fs';
import * as path from 'node:path';
import * as vscode from 'vscode';

/** Extensões de código-fonte PL/SQL consideradas na resolução de cobertura. */
const SOURCE_EXTENSIONS = ['.sql', '.pks', '.pkb', '.prc', '.fnc', '.trg', '.tpb', '.bdy', '.typ'];

/** Variantes do caminho trocando a extensão (o relatório sempre traz `.sql`). */
function withSourceExtensions(filePath: string): string[] {
  const ext = path.extname(filePath);
  const base = ext ? filePath.slice(0, -ext.length) : filePath;
  const variants = [filePath];
  for (const e of SOURCE_EXTENSIONS) {
    if (e !== ext) variants.push(`${base}${e}`);
  }
  return variants;
}

/**
 * Resolve o filename do relatório para um Uri local existente.
 * Tenta, em ordem: folderRoot (se fornecido); workspaceRoot; sourcePath.
 * O caminho pode vir com `.sql` (mapa de `mapDbPathsToFiles`) mas o arquivo
 * real pode usar `.pks`/`.pkb`/`.prc`/`.fnc`/etc. — por isso testa variantes
 * de extensão. Nunca sai da raiz do workspace (mitiga path traversal via XML).
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
    const paths = [
      file,
      path.join(base, file),
      path.join(base, sourcePath, file),
      path.join(base, sourcePath, path.basename(file)),
    ];
    for (const p of paths) {
      for (const variant of withSourceExtensions(p)) candidates.push(variant);
    }
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
