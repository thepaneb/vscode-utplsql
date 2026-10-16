import * as vscode from 'vscode';
import { getExtensionLocale, readConfig } from '../config';
import { fetchDbObjectSource } from '../dbSourceProvider';
import { type ExtensionLocale, t } from '../i18n';
import { buildSuiteTemplate, deriveObjectName, deriveRoutines, deriveSuiteName } from '../scaffold';
import { parseSuiteText } from '../suiteParser';
import { virtualSourceUri } from '../virtualSource';

/**
 * Geração de suíte de teste (PRD-59 + PRD-100): um único comando,
 * `utplsql.generateTestSuite`, com Code Action nos arquivos de produção.
 *
 * Fonte (RF2): o arquivo ativo (`.pks`/`.pkb`/...) ou, sem editor, um objeto do
 * banco resolvido por `ALL_SOURCE` (reusa o provider virtual da PRD-80 — sem SQL
 * novo). Sem rotinas, o template é o esqueleto da PRD-59.
 */

const SOURCE_SELECTOR: vscode.DocumentSelector = {
  scheme: 'file',
  pattern: '**/*.{pks,pkb,sql,prc,fnc,trg}',
};

const COMMAND_ID = 'utplsql.generateTestSuite';

interface ResolvedSource {
  objectName: string;
  text: string;
  /** Pasta de destino (ausente quando a fonte veio do banco). */
  dir?: vscode.Uri;
}

/** Produção = fonte que NÃO é uma suíte utPLSQL (nem usa o prefixo de suíte). */
export function isProductionSource(text: string, fileName: string, prefix: string): boolean {
  const name = deriveObjectName(fileName);
  if (prefix && name.toLowerCase().startsWith(prefix.toLowerCase())) return false;
  return parseSuiteText(text) === null;
}

function editorSource(): { document: vscode.TextDocument; dir: vscode.Uri } | undefined {
  const editor = vscode.window.activeTextEditor;
  if (!editor) return undefined;
  const fsPath = editor.document.uri.fsPath;
  if (!/\.(pks|pkb|sql|prc|fnc|trg)$/i.test(fsPath)) return undefined;
  const dirPath = fsPath.replace(/[/\\][^/\\]*$/, '');
  if (!dirPath || dirPath === fsPath) return undefined;
  return { document: editor.document, dir: vscode.Uri.file(dirPath) };
}

/**
 * Fonte sem arquivo local: pergunta `SCHEMA.OBJETO` e busca o texto no banco.
 * A pasta de destino é a raiz do primeiro workspace folder.
 */
async function databaseSource(locale: ExtensionLocale): Promise<ResolvedSource | undefined> {
  const folders = vscode.workspace.workspaceFolders;
  if (!folders?.length) return undefined;

  const input = (
    await vscode.window.showInputBox({
      prompt: t(locale, 'ext.scaffold.objectPrompt'),
      placeHolder: 'APP.APP_PKG',
    })
  )?.trim();
  if (!input) return undefined;

  const parts = input.split('.').filter(Boolean);
  const schema = parts.length > 1 ? parts[0].toUpperCase() : '';
  const object = (parts.length > 1 ? parts.slice(1).join('.') : parts[0]).toUpperCase();
  const text = await fetchDbObjectSource(virtualSourceUri(schema, object, 'pks'));
  if (!text.trim()) return undefined;

  return { objectName: object, text, dir: folders[0].uri };
}

async function fileExists(uri: vscode.Uri): Promise<boolean> {
  try {
    await vscode.workspace.fs.stat(uri);
    return true;
  } catch {
    return false;
  }
}

/** Fonte do arquivo ativo (com pasta de destino) ou, sem ele, do banco. */
async function resolveSource(locale: ExtensionLocale): Promise<ResolvedSource | undefined> {
  const fromEditor = editorSource();
  if (fromEditor) {
    return {
      objectName: deriveObjectName(fromEditor.document.uri.path),
      text: fromEditor.document.getText(),
      dir: fromEditor.dir,
    };
  }
  return databaseSource(locale);
}

async function generateTestSuite(): Promise<void> {
  const locale = getExtensionLocale();
  const cfg = readConfig();
  const options = {
    testPackagePrefix: cfg.generateTestPackagePrefix,
    testPackageSuffix: cfg.generateTestPackageSuffix,
    numberOfTestsPerUnit: cfg.generateTestsPerUnit,
    generateComments: cfg.generateComments,
  };

  const source = await resolveSource(locale);
  if (!source?.dir) {
    void vscode.window.showWarningMessage(t(locale, 'ext.scaffold.noSource'));
    return;
  }

  const suiteName = deriveSuiteName(source.objectName, options);
  const destination = vscode.Uri.joinPath(source.dir, `${suiteName}.pks`);
  const relative = vscode.workspace.asRelativePath(destination, false);

  if (await fileExists(destination)) {
    const overwrite = t(locale, 'ext.scaffold.overwriteButton');
    const picked = await vscode.window.showWarningMessage(
      t(locale, 'ext.scaffold.overwrite', { file: relative }),
      { modal: true },
      overwrite,
    );
    if (picked !== overwrite) return;
  }

  const sql = buildSuiteTemplate(source.objectName, deriveRoutines(source.text), options);

  try {
    await vscode.workspace.fs.writeFile(destination, Buffer.from(sql, 'utf8'));
  } catch (error) {
    void vscode.window.showErrorMessage(t(locale, 'ext.scaffold.failed', { error: String(error) }));
    return;
  }

  const document = await vscode.workspace.openTextDocument(destination);
  await vscode.window.showTextDocument(document);
  void vscode.window.showInformationMessage(t(locale, 'ext.scaffold.created', { path: relative }));
}

class GenerateSuiteCodeActionProvider implements vscode.CodeActionProvider {
  provideCodeActions(document: vscode.TextDocument): vscode.CodeAction[] {
    const cfg = readConfig();
    if (!isProductionSource(document.getText(), document.uri.path, cfg.generateTestPackagePrefix)) {
      return [];
    }
    const action = new vscode.CodeAction(
      t(getExtensionLocale(), 'nls.command.generateTestSuite'),
      vscode.CodeActionKind.Refactor,
    );
    action.command = { command: COMMAND_ID, title: action.title };
    return [action];
  }
}

export function registerScaffoldCommands(context: vscode.ExtensionContext): void {
  context.subscriptions.push(
    vscode.commands.registerCommand(COMMAND_ID, () => generateTestSuite()),
    vscode.languages.registerCodeActionsProvider(
      SOURCE_SELECTOR,
      new GenerateSuiteCodeActionProvider(),
      {
        providedCodeActionKinds: [vscode.CodeActionKind.Refactor],
      },
    ),
  );
}
