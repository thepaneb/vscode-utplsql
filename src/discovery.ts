import * as vscode from 'vscode';
import { parseSuiteText, type TestProc } from './suiteParser';

export interface SuiteFile {
  uri: vscode.Uri;
  packageName: string;
  suiteDescription: string;
  tests: TestProc[];
}

/** Faz o parse de um arquivo, associando o Uri. Retorna null se não for suite. */
export function parseSuite(uri: vscode.Uri, text: string): SuiteFile | null {
  const parsed = parseSuiteText(text);
  if (!parsed) {
    return null;
  }
  return { uri, ...parsed };
}

/** Varre o workspace e devolve todas as suites encontradas. */
export async function discoverWorkspace(patterns: string[]): Promise<SuiteFile[]> {
  const results: SuiteFile[] = [];
  const seen = new Set<string>();

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
          results.push(suite);
        }
      } catch {
        // arquivo ilegível — ignora
      }
    }
  }

  return results;
}
