import * as vscode from 'vscode';
import { parseSuiteText, type TestProc } from './suiteParser';

export interface SuiteFile {
  uri: vscode.Uri;
  packageName: string;
  suiteDescription: string;
  tests: TestProc[];
  folder: vscode.WorkspaceFolder;
}

type ParsedSuite = Omit<SuiteFile, 'folder'>;

function resolveFolder(
  uri: vscode.Uri,
  folders: readonly vscode.WorkspaceFolder[],
): vscode.WorkspaceFolder {
  const uriStr = uri.toString().toLowerCase();
  let best: vscode.WorkspaceFolder | undefined;
  let bestLen = 0;
  for (const f of folders) {
    const prefix = f.uri.toString().toLowerCase();
    if (uriStr.startsWith(prefix) && prefix.length > bestLen) {
      best = f;
      bestLen = prefix.length;
    }
  }
  return best ?? folders[0];
}

export function parseSuite(uri: vscode.Uri, text: string): ParsedSuite | null {
  const parsed = parseSuiteText(text);
  if (!parsed) {
    return null;
  }
  return { uri, ...parsed };
}

export async function discoverWorkspace(
  patterns: string[],
  folders?: readonly vscode.WorkspaceFolder[],
): Promise<SuiteFile[]> {
  const results: SuiteFile[] = [];
  const seen = new Set<string>();
  const targets = folders ?? vscode.workspace.workspaceFolders ?? [];

  for (const pattern of patterns) {
    const uris = await vscode.workspace.findFiles(pattern, '**/node_modules/**');
    for (const uri of uris) {
      if (seen.has(uri.toString())) {
        continue;
      }
      seen.add(uri.toString());
      try {
        const bytes = await vscode.workspace.fs.readFile(uri);
        const text = Buffer.from(bytes).toString('utf8');
        const suite = parseSuite(uri, text);
        if (suite && suite.tests.length > 0) {
          const folder = resolveFolder(uri, targets);
          results.push({ ...suite, folder });
        }
      } catch {
        // arquivo ilegível — ignora
      }
    }
  }

  return results;
}
