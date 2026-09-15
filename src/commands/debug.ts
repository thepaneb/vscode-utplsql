import * as vscode from 'vscode';
import { getExtensionLocale, readConfig } from '../config';
import { t } from '../i18n';

// RF5: debugger carregado sob demanda (bundle menor).
let debuggerModule: Promise<typeof import('../debugger')> | undefined;

function loadDebugger(): Promise<typeof import('../debugger')> {
  if (!debuggerModule) debuggerModule = import('../debugger.js');
  return debuggerModule;
}

export function registerDebug(_context: vscode.ExtensionContext): void {
  const locale = getExtensionLocale();

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
    }),
  );
}
