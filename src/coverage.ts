import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import * as vscode from 'vscode';
import { getExtensionLocale } from './config';
import { t } from './i18n';

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

// ── Relatório HTML de cobertura (PRD-108) ────────────────────────────────

export type CoverageOutputKind = 'html' | 'xml' | 'console';

/**
 * Classifica o primeiro texto de um `output_id` do buffer do utPLSQL. O HTML
 * do `ut_coverage_html_reporter` começa com `<!DOCTYPE html>`; JUnit/Cobertura
 * começam com XML (`<?xml`/`<coverage`); o restante é documentação/console.
 */
export function classifyCoverageOutput(text: string): CoverageOutputKind {
  const head = text.trimStart().toLowerCase();
  if (head.startsWith('<!doctype html') || head.startsWith('<html')) return 'html';
  if (head.startsWith('<')) return 'xml';
  return 'console';
}

/** Caminho do HTML: `test-results/coverage.html` no root executado (ou temp). */
export function coverageHtmlReportPath(reportRoot?: string): string {
  if (!reportRoot) return path.join(os.tmpdir(), 'utplsql-coverage', 'coverage.html');
  return path.join(reportRoot, 'test-results', 'coverage.html');
}

/** Remove o alvo anterior e o `.tmp` (no início do run, para não deixar stale). */
export async function prepareCoverageHtmlReport(filePath: string): Promise<void> {
  await fs.promises.mkdir(path.dirname(filePath), { recursive: true });
  await fs.promises.rm(filePath, { force: true }).catch(() => {});
  await fs.promises.rm(`${filePath}.tmp`, { force: true }).catch(() => {});
}

/** Escrita atômica: `.tmp` → rename, para nunca abrir um arquivo parcial. */
export async function writeCoverageHtmlReport(html: string, filePath: string): Promise<void> {
  await prepareCoverageHtmlReport(filePath);
  const tmp = `${filePath}.tmp`;
  await fs.promises.writeFile(tmp, html, 'utf8');
  await fs.promises.rename(tmp, filePath);
}

/**
 * Notificação fire-and-forget após o `run.end()` (PRD-108 RF2/RF3). Abrir no
 * navegador ou salvar como, sem renderizar em webview e sem logar o conteúdo.
 */
export async function offerCoverageHtmlReport(filePath: string): Promise<void> {
  const locale = getExtensionLocale();
  const open = t(locale, 'coverage.html.open');
  const save = t(locale, 'ext.export.toFile');
  const choice = await vscode.window.showInformationMessage(
    t(locale, 'coverage.html.ready', { path: filePath }),
    open,
    save,
  );
  if (choice === open) {
    try {
      await vscode.env.openExternal(vscode.Uri.file(filePath));
    } catch (e) {
      vscode.window.showErrorMessage(`${t(locale, 'common.error')}: ${String(e)}`);
    }
    return;
  }
  if (choice !== save) return;
  try {
    const target = await vscode.window.showSaveDialog({
      filters: { 'HTML report': ['html'] },
      saveLabel: save,
      defaultUri: vscode.Uri.file(path.join(os.homedir(), 'coverage.html')),
    });
    if (!target) return;
    await fs.promises.copyFile(filePath, target.fsPath);
    vscode.window.showInformationMessage(t(locale, 'coverage.html.saved', { path: target.fsPath }));
  } catch (e) {
    vscode.window.showErrorMessage(`${t(locale, 'common.error')}: ${String(e)}`);
  }
}
