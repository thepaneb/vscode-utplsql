import * as vscode from 'vscode';
import { getExtensionLocale, readConfig, resolveConnectionNoPrompt } from '../config';
import { t } from '../i18n';
import { logger } from '../logger';
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
    vscode.commands.registerCommand('utplsql.rebuildAnnotations', async () => {
      const conn = resolveConnectionNoPrompt();
      if (!conn) {
        vscode.window.showWarningMessage(t(locale, 'ext.noConnection'));
        return;
      }
      let oracledb: typeof import('oracledb');
      try {
        const mod = await import('oracledb');
        oracledb =
          ((mod as Record<string, unknown>).default as typeof import('oracledb')) ??
          (mod as typeof import('oracledb'));
      } catch {
        vscode.window.showErrorMessage(t(locale, 'common.oracledbMissing'));
        return;
      }
      const { rebuildAnnotationCache } = await import('../oracleRunner.js');
      try {
        await rebuildAnnotationCache(oracledb, conn, readConfig());
        await deps.refresh();
        vscode.window.showInformationMessage(t(locale, 'ext.rebuildCache.ok'));
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        logger.warn('utplsql.rebuildAnnotations falhou', { error: msg });
        vscode.window.showErrorMessage(msg);
      }
    }),
  );
}
