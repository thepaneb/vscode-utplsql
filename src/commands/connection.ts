import * as vscode from 'vscode';
import {
  clearSessionConnection,
  getExtensionLocale,
  readConfig,
  resolveConnection,
} from '../config';
import { t } from '../i18n';
import type { CommandDeps } from './deps';

export function registerConnectionCommands(
  context: vscode.ExtensionContext,
  deps: CommandDeps,
): void {
  const { state } = deps;
  const locale = getExtensionLocale();

  context.subscriptions.push(
    vscode.commands.registerCommand('utplsql.selectReporter', async () => {
      const conn = await resolveConnection();
      if (!conn) return;
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
      const { withOracleConnection, listReportersOracle } = await import('../oracleRunner.js');
      const cfg = readConfig();
      await withOracleConnection(oracledb, conn, cfg, async (oracleConn) => {
        const reporters = await listReportersOracle(oracleConn);
        if (reporters.length === 0) {
          vscode.window.showErrorMessage(
            t(locale, 'ext.reporters.listFailed', { error: t(locale, 'ext.reporters.listEmpty') }),
          );
          return;
        }
        const selected = await vscode.window.showQuickPick(reporters, {
          placeHolder: t(locale, 'ext.reporters.placeholder'),
        });
        if (selected) {
          state.setExtraReporter(selected);
          vscode.window.showInformationMessage(
            t(locale, 'ext.reporters.willUse', { name: selected }),
          );
        }
      });
    }),
    vscode.commands.registerCommand('utplsql.clearConnection', () => {
      clearSessionConnection();
      vscode.window.showInformationMessage(t(locale, 'ext.connection.cleared'));
    }),
    vscode.commands.registerCommand('utplsql.showInfo', async () => {
      const conn = await resolveConnection();
      if (!conn) {
        vscode.window.showErrorMessage(t(locale, 'ext.noConnection'));
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
      const { withOracleConnection, getOracleInfo } = await import('../oracleRunner.js');
      const cfg = readConfig();
      await withOracleConnection(oracledb, conn, cfg, async (oracleConn) => {
        const info = await getOracleInfo(oracleConn);
        const msg = `utPLSQL: ${info.utVersion ?? 'unknown'}\nOracle DB: ${info.dbVersion ?? 'unknown'}`;
        const copy = await vscode.window.showInformationMessage(msg, t(locale, 'common.copy'));
        if (copy) vscode.env.clipboard.writeText(msg);
      });
    }),
    vscode.commands.registerCommand('utplsql.configureConnection', async () => {
      await vscode.commands.executeCommand('workbench.action.openSettings', 'utplsql.connection');
    }),
  );
}
