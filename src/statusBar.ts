import * as vscode from 'vscode';
import { getExtensionLocale, readConfig } from './config';
import { activeProfileName } from './connectionProfiles';
import { t } from './i18n';

export interface StatusBarFormat {
  icon: string;
  text: string;
  tooltip: string;
}

export function formatResults(
  passed: number,
  failed: number,
  skipped: number,
  errored: number,
  durationMs: number,
): StatusBarFormat {
  const locale = getExtensionLocale();
  const total = passed + failed + skipped + errored;
  const icon = failed > 0 || errored > 0 ? '$(testing-failed)' : '$(testing-passed)';
  const duration = (durationMs / 1000).toFixed(1);
  const text = `${icon} ${passed}/${total} ${duration}s`;

  const parts: string[] = [];
  if (passed > 0) parts.push(`$(check) ${t(locale, 'status.passed', { count: passed })}`);
  if (failed > 0) parts.push(`$(error) ${t(locale, 'status.failed', { count: failed })}`);
  if (errored > 0) parts.push(`$(warning) ${t(locale, 'status.errored', { count: errored })}`);
  if (skipped > 0)
    parts.push(`$(debug-step-over) ${t(locale, 'status.skipped', { count: skipped })}`);
  parts.push(`$(watch) ${duration}s`);

  return { icon, text, tooltip: parts.join('\n') };
}

export class UtplsqlStatusBar implements vscode.Disposable {
  private item: vscode.StatusBarItem;
  private lastUpdate = 0;

  constructor() {
    this.item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    this.item.command = 'utplsql.switchProfile';
    if (!readConfig().statusBarEnabled) return;
    this.showIdle();
  }

  showIdle(): void {
    if (!readConfig().statusBarEnabled) return;
    const locale = getExtensionLocale();
    const profile = activeProfileName();
    this.item.text = profile ? `$(database) ${profile}` : '$(beaker) utPLSQL';
    this.item.tooltip = profile
      ? t(locale, 'status.profileTooltip', { name: profile })
      : t(locale, 'status.idle');
    this.item.show();
  }

  showRunning(current: number, total: number): void {
    if (!readConfig().statusBarEnabled) return;
    const locale = getExtensionLocale();
    const now = Date.now();
    if (now - this.lastUpdate < 200) return;
    this.lastUpdate = now;
    this.item.text = `$(sync~spin) ${t(locale, 'status.running', { current, total })}`;
    this.item.tooltip = t(locale, 'status.runningDetail', { current, total });
    this.item.show();
  }

  showResults(
    passed: number,
    failed: number,
    skipped: number,
    errored: number,
    durationMs: number,
  ): void {
    if (!readConfig().statusBarEnabled) return;
    const fmt = formatResults(passed, failed, skipped, errored, durationMs);
    const profile = activeProfileName();
    this.item.text = profile ? `$(database) ${profile}  ${fmt.text}` : fmt.text;
    this.item.tooltip = fmt.tooltip;
    this.item.show();
  }

  dispose(): void {
    this.item.dispose();
  }
}
