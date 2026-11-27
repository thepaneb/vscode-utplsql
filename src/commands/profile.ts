import * as vscode from 'vscode';
import { getExtensionLocale } from '../config';
import {
  clearWalletPassword,
  generateId,
  getActiveProfile,
  getAllProfiles,
  importFromSqlDeveloper,
  saveProfiles,
  selectProfile,
  setActiveProfile,
  setWalletPassword,
} from '../connectionProfiles';
import { t } from '../i18n';
import type { ConnectionProfile, ProfileCharset } from '../types';
import type { CommandDeps } from './deps';

export function registerProfileCommands(context: vscode.ExtensionContext, deps: CommandDeps): void {
  context.subscriptions.push(
    vscode.commands.registerCommand('utplsql.switchProfile', async () => {
      const profiles = getAllProfiles();
      if (profiles.length === 0) {
        vscode.window.showInformationMessage(t(getExtensionLocale(), 'ext.profile.none'));
        return;
      }
      const selected = await selectProfile(profiles);
      if (!selected) return;
      await setActiveProfile(selected.id);
      deps.getStatusBar()?.showIdle();
      vscode.window.showInformationMessage(
        t(getExtensionLocale(), 'ext.profile.active', { name: selected.name }),
      );
    }),
    vscode.commands.registerCommand('utplsql.manageProfiles', async () => {
      await vscode.commands.executeCommand('workbench.action.openSettings', 'utplsql.profiles');
    }),
    vscode.commands.registerCommand('utplsql.setWalletPassword', async () => {
      const profile = getActiveProfile();
      if (!profile) {
        vscode.window.showWarningMessage(t(getExtensionLocale(), 'ext.wallet.noProfile'));
        return;
      }
      const password = await vscode.window.showInputBox({
        title: t(getExtensionLocale(), 'ext.wallet.title'),
        prompt: t(getExtensionLocale(), 'ext.wallet.prompt'),
        password: true,
        ignoreFocusOut: true,
      });
      if (password === undefined) return; // cancelado
      if (password === '') {
        await clearWalletPassword(profile.id);
        vscode.window.showInformationMessage(
          t(getExtensionLocale(), 'ext.wallet.cleared', { name: profile.name }),
        );
        return;
      }
      await setWalletPassword(profile.id, profile.connection, password);
      vscode.window.showInformationMessage(
        t(getExtensionLocale(), 'ext.wallet.saved', { name: profile.name }),
      );
    }),
    vscode.commands.registerCommand('utplsql.importSqlDevConnections', async () => {
      const imported = await importFromSqlDeveloper();
      if (imported.length === 0) {
        vscode.window.showWarningMessage(t(getExtensionLocale(), 'ext.sqlDev.import.none'));
        return;
      }
      const merged = [...getAllProfiles(), ...imported];
      await saveProfiles(merged);
      vscode.window.showInformationMessage(
        t(getExtensionLocale(), 'ext.sqlDev.import.ok', { count: imported.length }),
      );
    }),
    vscode.commands.registerCommand('utplsql.newProfile', async () => {
      const name = await vscode.window.showInputBox({
        title: t(getExtensionLocale(), 'ext.profile.new.title'),
        prompt: t(getExtensionLocale(), 'ext.profile.new.namePrompt'),
        placeHolder: t(getExtensionLocale(), 'ext.profile.new.namePlaceholder'),
      });
      if (!name?.trim()) return;
      const connection = await vscode.window.showInputBox({
        title: t(getExtensionLocale(), 'ext.profile.new.title'),
        prompt: t(getExtensionLocale(), 'ext.profile.new.connPrompt'),
        password: true,
      });
      if (!connection?.trim()) return;
      const sourcePath = await vscode.window.showInputBox({
        title: t(getExtensionLocale(), 'ext.profile.new.title'),
        prompt: t(getExtensionLocale(), 'ext.profile.new.sourcePrompt'),
        placeHolder: t(getExtensionLocale(), 'ext.profile.new.sourcePlaceholder'),
      });
      const description = await vscode.window.showInputBox({
        title: t(getExtensionLocale(), 'ext.profile.new.title'),
        prompt: t(getExtensionLocale(), 'ext.profile.new.descPrompt'),
        placeHolder: t(getExtensionLocale(), 'ext.profile.new.descPlaceholder'),
      });
      const charsetPick = await vscode.window.showQuickPick(
        [
          { label: 'utf8', description: t(getExtensionLocale(), 'ext.profile.new.charsetDefault') },
          { label: 'latin1' },
          { label: 'win1252' },
        ],
        {
          title: t(getExtensionLocale(), 'ext.profile.new.title'),
          placeHolder: t(getExtensionLocale(), 'ext.profile.new.charsetPrompt'),
        },
      );
      const profile: ConnectionProfile = {
        id: generateId(),
        name: name.trim(),
        connection: connection.trim(),
      };
      if (sourcePath?.trim()) profile.sourcePath = sourcePath.trim();
      if (description?.trim()) profile.description = description.trim();
      if (charsetPick && charsetPick.label !== 'utf8') {
        profile.charset = charsetPick.label as ProfileCharset;
      }
      const profiles = getAllProfiles();
      await saveProfiles([...profiles, profile]);
      await setActiveProfile(profile.id);
      deps.getStatusBar()?.showIdle();
      vscode.window.showInformationMessage(
        t(getExtensionLocale(), 'ext.profile.new.created', { name: profile.name }),
      );
    }),
  );
}
