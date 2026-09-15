import * as vscode from 'vscode';
import { getExtensionLocale, readConfig } from '../config';
import { getProfileConnection, pickProfileOrGuide } from '../connectionProfiles';
import { t } from '../i18n';
import type { ConnectionProfile, ProfileCharset } from '../types';

// RF5: script runner carregado sob demanda (bundle menor).
let scriptRunnerModule: Promise<typeof import('../scriptRunner')> | undefined;
let scriptChannel: vscode.OutputChannel | undefined;

function loadScriptRunner(): Promise<typeof import('../scriptRunner')> {
  if (!scriptRunnerModule) scriptRunnerModule = import('../scriptRunner.js');
  return scriptRunnerModule;
}

/** OutputChannel dedicado ("utPLSQL Script") — criado sob demanda. */
function getScriptChannel(): vscode.OutputChannel {
  if (!scriptChannel) scriptChannel = vscode.window.createOutputChannel('utPLSQL Script');
  return scriptChannel;
}

/** Lista todos os arquivos sob uma pasta, recursivamente (fsPaths). */
async function listFilesRecursive(folder: vscode.Uri): Promise<string[]> {
  const out: string[] = [];
  const entries = await vscode.workspace.fs.readDirectory(folder);
  for (const [name, type] of entries) {
    const child = vscode.Uri.joinPath(folder, name);
    if (type === vscode.FileType.Directory) {
      out.push(...(await listFilesRecursive(child)));
    } else if (type === vscode.FileType.File) {
      out.push(child.fsPath);
    }
  }
  return out;
}

/**
 * Executa um texto de script já carregado (editor) contra o perfil.
 * `charset` omitido — o texto já vem decodificado pelo VSCode.
 */
async function runScriptText(
  label: string,
  text: string,
  profile: ConnectionProfile,
  charset: ProfileCharset | undefined,
): Promise<void> {
  const locale = getExtensionLocale();
  const { connectOracle, executeScript, splitScript } = await loadScriptRunner();
  const statements = splitScript(text);
  if (statements.length === 0) {
    vscode.window.showInformationMessage(t(locale, 'script.noStatements'));
    return;
  }
  const cfg = readConfig();
  const channel = getScriptChannel();
  channel.show(true);
  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: 'utPLSQL Script',
      cancellable: true,
    },
    async (_progress, token) => {
      const connect = (conn: string) =>
        connectOracle(conn, { timeoutSeconds: cfg.scriptRunnerTimeoutSeconds });
      await executeScript(connect, {
        connection: getProfileConnection(profile),
        statements,
        output: channel,
        token,
        autoCommit: cfg.scriptRunnerAutoCommit,
        stopOnError: cfg.scriptRunnerStopOnError,
        dbmsOutput: cfg.scriptRunnerDbmsOutput,
        label,
        charset,
      });
    },
  );
}

/**
 * Executa arquivos de script do Explorer: lê bytes, decodifica no charset do
 * perfil e executa em sequência no mesmo OutputChannel.
 */
async function runScriptFiles(paths: string[], profile: ConnectionProfile): Promise<void> {
  const charset = profile.charset ?? 'utf8';
  const { decodeScript } = await loadScriptRunner();
  for (const fsPath of paths) {
    const base = fsPath.split(/[\\/]/).pop() ?? fsPath;
    let text: string;
    try {
      const bytes = await vscode.workspace.fs.readFile(vscode.Uri.file(fsPath));
      text = decodeScript(bytes, profile.charset);
    } catch (err) {
      const channel = getScriptChannel();
      channel.show(true);
      channel.appendLine(`${base}: ${err instanceof Error ? err.message : String(err)}`);
      return;
    }
    await runScriptText(base, text, profile, charset);
  }
}

export function registerScriptCommands(context: vscode.ExtensionContext): void {
  const locale = getExtensionLocale();

  context.subscriptions.push(
    vscode.commands.registerCommand('utplsql.runScript', async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showWarningMessage(t(locale, 'script.noEditor'));
        return;
      }
      const profile = await pickProfileOrGuide();
      if (!profile) return;
      const text = editor.document.getText();
      await runScriptText(editor.document.fileName, text, profile, undefined);
    }),
    vscode.commands.registerCommand('utplsql.runScriptFile', async (uri?: vscode.Uri) => {
      const target = uri ?? vscode.window.activeTextEditor?.document.uri;
      if (!target) {
        vscode.window.showWarningMessage(t(locale, 'script.noEditor'));
        return;
      }
      const profile = await pickProfileOrGuide();
      if (!profile) return;
      await runScriptFiles([target.fsPath], profile);
    }),
    vscode.commands.registerCommand('utplsql.runScriptFolder', async (uri?: vscode.Uri) => {
      const target = uri ?? vscode.window.activeTextEditor?.document.uri;
      if (!target) {
        vscode.window.showWarningMessage(t(locale, 'script.noEditor'));
        return;
      }
      const folderUri = target;
      try {
        const stat = await vscode.workspace.fs.stat(folderUri);
        if (stat.type !== vscode.FileType.Directory) {
          vscode.window.showWarningMessage(t(locale, 'script.notFolder'));
          return;
        }
      } catch {
        vscode.window.showWarningMessage(t(locale, 'script.notFolder'));
        return;
      }
      const profile = await pickProfileOrGuide();
      if (!profile) return;
      const all = await listFilesRecursive(folderUri);
      const { filterScriptFiles } = await loadScriptRunner();
      const files = filterScriptFiles(all, readConfig().scriptRunnerFilePattern);
      if (files.length === 0) {
        vscode.window.showWarningMessage(t(locale, 'script.noScriptsInFolder'));
        return;
      }
      await runScriptFiles(files, profile);
    }),
  );
}
