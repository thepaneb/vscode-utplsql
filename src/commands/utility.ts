import * as vscode from 'vscode';
import { getExtensionLocale } from '../config';
import { t } from '../i18n';
import { setupValidator } from '../quickfix';
import type { CommandDeps } from './deps';

export function registerUtilityCommands(context: vscode.ExtensionContext, deps: CommandDeps): void {
  const locale = getExtensionLocale();

  context.subscriptions.push(
    vscode.commands.registerCommand('utplsql.refresh', () => deps.refresh()),
    vscode.commands.registerCommand('utplsql.copyGrantsToClipboard', () => {
      const grants = [
        'GRANT EXECUTE ON SYS.DBMS_PROFILER TO <your_schema>;',
        'GRANT EXECUTE ON SYS.DBMS_PLSQL_CODE_COVERAGE TO <your_schema>;',
      ].join('\n');
      vscode.env.clipboard.writeText(grants);
      vscode.window.showInformationMessage(t(locale, 'ext.grants.copied'));
    }),
    vscode.commands.registerCommand('utplsql.validateSetup', async () => {
      const [activationDiags, installDiags] = await Promise.all([
        setupValidator.validateOnActivation(),
        setupValidator.validateUtplsqlInstall(),
      ]);
      const diags = [...activationDiags, ...installDiags];
      setupValidator.applyDiagnostics(diags);
      vscode.window.showInformationMessage(
        diags.length === 0
          ? t(locale, 'ext.validate.ok')
          : t(locale, 'ext.validate.problems', { count: diags.length }),
      );
    }),
    vscode.commands.registerCommand('utplsql.recompileUt3', () => setupValidator.recompileUt3()),
  );
}
