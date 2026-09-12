import * as vscode from 'vscode';
import { getExtensionLocale, readConfig } from './config';
import { t } from './i18n';

const RE_PACKAGE = /create\s+(?:or\s+replace\s+)?package\s+(?:body\s+)?(?:"?(\w+)"?\.)?"?(\w+)"?/i;
const RE_SUITE = /--\s*%suite\s*(?:\(([^)]*)\))?/i;
const RE_TEST = /--\s*%test\s*(?:\(([^)]*)\))?/i;
const RE_PROC = /\bprocedure\s+"?(\w+)"?/i;

export interface CodeLensItem {
  line: number;
  type: 'suite' | 'test';
  description: string;
  packageName: string;
  procName?: string;
}

export function parseCodeLensItems(text: string): CodeLensItem[] {
  const pkgMatch = RE_PACKAGE.exec(text);
  if (!pkgMatch) return [];
  const packageName = pkgMatch[2];

  if (!RE_SUITE.test(text)) return [];

  const lines = text.split(/\r?\n/);
  const items: CodeLensItem[] = [];
  let pendingDesc: string | null = null;
  let pendingLine = -1;

  for (let i = 0; i < lines.length; i++) {
    const suiteMatch = RE_SUITE.exec(lines[i]);
    if (suiteMatch) {
      items.push({
        line: i,
        type: 'suite',
        description: (suiteMatch[1] ?? packageName).trim(),
        packageName,
      });
      continue;
    }

    const testMatch = RE_TEST.exec(lines[i]);
    if (testMatch) {
      pendingDesc = testMatch[1]?.trim() ?? '';
      pendingLine = i;
      continue;
    }

    if (pendingDesc !== null) {
      const procMatch = RE_PROC.exec(lines[i]);
      if (procMatch) {
        items.push({
          line: pendingLine,
          type: 'test',
          description: pendingDesc || procMatch[1],
          packageName,
          procName: procMatch[1],
        });
        pendingDesc = null;
        pendingLine = -1;
      }
    }
  }

  return items;
}

export class UtplsqlCodeLensProvider implements vscode.CodeLensProvider {
  private _onDidChangeCodeLenses = new vscode.EventEmitter<void>();
  public readonly onDidChangeCodeLenses = this._onDidChangeCodeLenses.event;

  refresh(): void {
    this._onDidChangeCodeLenses.fire();
  }

  provideCodeLenses(
    document: vscode.TextDocument,
    _token: vscode.CancellationToken,
  ): vscode.CodeLens[] {
    if (!readConfig().codeLensEnabled) return [];
    if (!document.fileName.endsWith('.pks')) return [];

    const items = parseCodeLensItems(document.getText());
    const lenses: vscode.CodeLens[] = [];

    for (const item of items) {
      const range = new vscode.Range(item.line, 0, item.line, 0);
      const locale = getExtensionLocale();
      const isSuite = item.type === 'suite';
      const desc = item.description;

      lenses.push(
        new vscode.CodeLens(range, {
          title: t(locale, isSuite ? 'codelens.runSuite' : 'codelens.runTest'),
          command: 'utplsql.runLens',
          tooltip: t(locale, 'codelens.runTip', { desc }),
          arguments: [
            {
              type: item.type,
              packageName: item.packageName,
              procName: item.procName,
              uri: document.uri.toString(),
              coverage: false,
            },
          ],
        }),
        new vscode.CodeLens(range, {
          title: t(locale, isSuite ? 'codelens.runSuiteCoverage' : 'codelens.runTestCoverage'),
          command: 'utplsql.runLens',
          tooltip: t(locale, 'codelens.runCoverageTip', { desc }),
          arguments: [
            {
              type: item.type,
              packageName: item.packageName,
              procName: item.procName,
              uri: document.uri.toString(),
              coverage: true,
            },
          ],
        }),
      );
    }

    return lenses;
  }
}
