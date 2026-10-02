import * as vscode from 'vscode';
import { findAnnotationAtLine } from '../annotation';
import type { CompileTarget } from '../compileForDebug.js';
import { getExtensionLocale, readConfig } from '../config';
import { resolveLastRunTarget, targetFromMeta } from '../debugTargets';
import { extractSchemaFromPath } from '../discovery';
import { t } from '../i18n';
import type { CommandDeps } from './deps';

// RF5: debugger carregado sob demanda (bundle menor).
let debuggerModule: Promise<typeof import('../debugger')> | undefined;

function loadDebugger(): Promise<typeof import('../debugger')> {
  if (!debuggerModule) debuggerModule = import('../debugger.js');
  return debuggerModule;
}

async function loadCompileHelper(): Promise<typeof import('../compileForDebug')> {
  return import('../compileForDebug.js');
}

const OBJECT_EXTS = new Set(['.pks', '.pkb', '.fnc', '.prc', '.trg', '.sql']);

/** Deriva o schema (modo schema) ou `undefined` para usar o usuário da conexão. */
function ownerForUri(uri: vscode.Uri): string | undefined {
  const cfg = readConfig();
  if (cfg.organization !== 'schema') return undefined;
  const folder = vscode.workspace.getWorkspaceFolder(uri);
  if (!folder) return undefined;
  return extractSchemaFromPath(uri.fsPath, folder.uri.fsPath, cfg.organizationSchemaPattern);
}

/** Coleta alvos de compilação a partir de uma URI (Explorer) ou do editor ativo. */
async function collectCompileTargets(uri?: vscode.Uri): Promise<CompileTarget[]> {
  const { debuggableFromFile } = await loadCompileHelper();
  const targets: CompileTarget[] = [];

  const addFile = (fileUri: vscode.Uri) => {
    const dec = debuggableFromFile(fileUri.fsPath);
    if (dec) targets.push({ name: dec.name, kinds: dec.kinds, owner: ownerForUri(fileUri) });
  };

  if (uri) {
    let stat: vscode.FileStat;
    try {
      stat = await vscode.workspace.fs.stat(uri);
    } catch {
      return [];
    }
    if (stat.type === vscode.FileType.Directory) {
      let entries: [string, vscode.FileType][] = [];
      try {
        entries = await vscode.workspace.fs.readDirectory(uri);
      } catch {
        entries = [];
      }
      for (const [name, type] of entries) {
        if (type !== vscode.FileType.File) continue;
        const dot = name.lastIndexOf('.');
        if (dot <= 0 || !OBJECT_EXTS.has(name.slice(dot).toLowerCase())) continue;
        addFile(vscode.Uri.joinPath(uri, name));
      }
      return targets;
    }
    addFile(uri);
    return targets;
  }

  const editor = vscode.window.activeTextEditor;
  if (editor) addFile(editor.document.uri);
  return targets;
}

export function registerDebug(_context: vscode.ExtensionContext, deps: CommandDeps): void {
  const locale = getExtensionLocale();
  const { state } = deps;

  try {
    const descriptorFactory: vscode.DebugAdapterDescriptorFactory = {
      async createDebugAdapterDescriptor(session) {
        const { UtplsqlDebugAdapterDescriptorFactory } = await loadDebugger();
        return new UtplsqlDebugAdapterDescriptorFactory().createDebugAdapterDescriptor(session);
      },
    };
    const configurationProvider: vscode.DebugConfigurationProvider = {
      async resolveDebugConfiguration(folder, config) {
        const { UtplsqlDebugConfigurationProvider } = await loadDebugger();
        return new UtplsqlDebugConfigurationProvider().resolveDebugConfiguration(folder, config);
      },
    };
    _context.subscriptions.push(
      vscode.debug.registerDebugAdapterDescriptorFactory('utplsql', descriptorFactory),
      vscode.debug.registerDebugConfigurationProvider('utplsql', configurationProvider),
    );
  } catch {
    // Registro do debugger é opcional — falha aqui não pode derrubar a ativação.
  }

  _context.subscriptions.push(
    vscode.commands.registerCommand('utplsql.debugTest', async () => {
      if (!readConfig().debuggerEnabled) {
        vscode.window.showInformationMessage(t(locale, 'ext.debug.disabled'));
        return;
      }
      try {
        const editor = vscode.window.activeTextEditor;
        const file = editor?.document.fileName ?? '';
        const base = file.split(/[\\/]/).pop() ?? '';
        const packageName = base.replace(/\.(pks|pkb|sql)$/i, '');
        if (!packageName) {
          vscode.window.showWarningMessage(t(locale, 'ext.debug.openPks'));
          return;
        }
        const { startDebugSession } = await loadDebugger();
        await startDebugSession(packageName);
      } catch (e) {
        vscode.window.showErrorMessage(e instanceof Error ? e.message : String(e));
      }
    }),
  );

  _context.subscriptions.push(
    vscode.commands.registerCommand('utplsql.compileForDebug', async (uri?: vscode.Uri) => {
      if (!readConfig().debuggerEnabled) {
        vscode.window.showInformationMessage(t(locale, 'ext.debug.disabled'));
        return;
      }
      try {
        const targets = await collectCompileTargets(uri);
        if (targets.length === 0) {
          vscode.window.showInformationMessage(t(locale, 'ext.compileForDebug.none'));
          return;
        }
        const { compileForDebug } = await loadCompileHelper();
        const result = await compileForDebug(targets);
        if (result.failed.length > 0) {
          const error = result.failed.map((f) => `${f.name}: ${f.error}`).join('; ');
          vscode.window.showErrorMessage(t(locale, 'ext.compileForDebug.failed', { error }));
          return;
        }
        vscode.window.showInformationMessage(
          t(locale, 'ext.compileForDebug.ok', { name: result.ok.join(', ') }),
        );
      } catch (e) {
        // Nunca ficar mudo: qualquer erro inesperado vira mensagem.
        const error = e instanceof Error ? e.message : String(e);
        vscode.window.showErrorMessage(t(locale, 'ext.compileForDebug.failed', { error }));
      }
    }),
  );

  const startForTarget = async (packageName: string, procName?: string): Promise<void> => {
    const { startDebugSession } = await loadDebugger();
    await startDebugSession(packageName, procName);
  };

  const debugAtCursor = async (): Promise<void> => {
    if (!readConfig().debuggerEnabled) {
      vscode.window.showInformationMessage(t(locale, 'ext.debug.disabled'));
      return;
    }
    const editor = vscode.window.activeTextEditor;
    if (!editor?.document.fileName.endsWith('.pks')) {
      vscode.window.showWarningMessage(t(locale, 'ext.runAtCursor.onlyPks'));
      return;
    }
    const annotation = findAnnotationAtLine(
      editor.document.getText(),
      editor.selection.active.line,
    );
    if (!annotation) {
      vscode.window.showWarningMessage(t(locale, 'ext.runAtCursor.noAnnotation'));
      return;
    }
    try {
      await startForTarget(
        annotation.packageName,
        annotation.type === 'test' ? annotation.procName : undefined,
      );
    } catch (e) {
      vscode.window.showErrorMessage(e instanceof Error ? e.message : String(e));
    }
  };

  const debugFailed = async (): Promise<void> => {
    if (!readConfig().debuggerEnabled) {
      vscode.window.showInformationMessage(t(locale, 'ext.debug.disabled'));
      return;
    }
    const failed = state.getLastFailedItems().filter((i) => targetFromMeta(state.getMeta(i)));
    if (failed.length === 0) {
      vscode.window.showWarningMessage(t(locale, 'ext.runFailed.none'));
      return;
    }
    let target = failed[0];
    if (failed.length > 1) {
      const items: { label: string; item: vscode.TestItem }[] = failed.map((i) => {
        const meta = state.getMeta(i);
        return { label: meta?.kind === 'test' ? meta.procName : i.id, item: i };
      });
      const picked = await vscode.window.showQuickPick(items, {
        placeHolder: t(locale, 'ext.debug.pickTest'),
      });
      if (!picked) return;
      target = picked.item;
    }
    const meta = targetFromMeta(state.getMeta(target));
    if (!meta) return;
    try {
      await startForTarget(meta.packageName, meta.procName);
    } catch (e) {
      vscode.window.showErrorMessage(e instanceof Error ? e.message : String(e));
    }
  };

  const debugLast = async (): Promise<void> => {
    if (!readConfig().debuggerEnabled) {
      vscode.window.showInformationMessage(t(locale, 'ext.debug.disabled'));
      return;
    }
    const lastRun = state.getLastRun();
    if (!lastRun) {
      vscode.window.showInformationMessage(t(locale, 'ext.noPreviousRun'));
      return;
    }
    const target = resolveLastRunTarget(lastRun);
    if (!target) {
      // `all` (ou alvo incompleto): cai no mesmo caminho do debugFailed.
      await debugFailed();
      return;
    }
    try {
      await startForTarget(target.packageName, target.procName);
    } catch (e) {
      vscode.window.showErrorMessage(e instanceof Error ? e.message : String(e));
    }
  };

  _context.subscriptions.push(
    vscode.commands.registerCommand('utplsql.debugAtCursor', debugAtCursor),
    vscode.commands.registerCommand('utplsql.debugFailed', debugFailed),
    vscode.commands.registerCommand('utplsql.debugLast', debugLast),
  );
}
