import * as vscode from 'vscode';
import type { TestStateManager } from './state';

interface CompilationError {
  line: number;
  column: number;
  code: string;
  message: string;
  fileUri?: vscode.Uri;
}

export class CompilationDiagnostics {
  private diagnosticCollection: vscode.DiagnosticCollection;

  constructor() {
    this.diagnosticCollection = vscode.languages.createDiagnosticCollection('utplsql-compilation');
  }

  parseFromOutput(output: string): CompilationError[] {
    const errors: CompilationError[] = [];
    const lines = output.split(/\r?\n/);

    let currentObj: { name: string; isBody?: boolean } | undefined;
    let pendingOra: { line: number; column: number } | undefined;
    let pendingPls: { code: string; message: string } | undefined;

    for (const line of lines) {
      const objMatch = line.match(/(?:Package|Package Body|Function|Procedure|Trigger)\s+(\S+)\s/i);
      if (objMatch) {
        if (pendingPls && currentObj) {
          errors.push({
            line: pendingOra?.line ?? 1,
            column: pendingOra?.column ?? 1,
            code: pendingPls.code,
            message: pendingPls.message,
            fileUri: undefined,
          });
          pendingPls = undefined;
          pendingOra = undefined;
        }
        currentObj = {
          name: objMatch[1].toLowerCase(),
          isBody: /body/i.test(line),
        };
        continue;
      }

      const oraMatch = line.match(/ORA-\d+:\s*line\s+(\d+),\s*column\s+(\d+)/i);
      if (oraMatch && currentObj) {
        pendingOra = {
          line: parseInt(oraMatch[1], 10) || 1,
          column: parseInt(oraMatch[2], 10) || 1,
        };
        const plsOnSameLine = line.match(/(PLS-\d+):\s*(.+)/);
        if (plsOnSameLine) {
          errors.push({
            line: pendingOra.line,
            column: pendingOra.column,
            code: plsOnSameLine[1],
            message: plsOnSameLine[2].trim(),
            fileUri: undefined,
          });
          pendingOra = undefined;
        }
        continue;
      }

      const plsMatch = line.match(/^(PLS-\d+):\s*(.+)/);
      if (plsMatch) {
        if (pendingOra && currentObj) {
          errors.push({
            line: pendingOra.line,
            column: pendingOra.column,
            code: plsMatch[1],
            message: plsMatch[2].trim(),
            fileUri: undefined,
          });
          pendingOra = undefined;
        } else if (currentObj) {
          pendingPls = { code: plsMatch[1], message: plsMatch[2].trim() };
        }
      }
    }

    if (pendingPls && currentObj) {
      errors.push({
        line: pendingOra?.line ?? 1,
        column: pendingOra?.column ?? 1,
        code: pendingPls.code,
        message: pendingPls.message,
        fileUri: undefined,
      });
    }

    return errors;
  }

  resolveFiles(errors: CompilationError[], state: TestStateManager): void {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders?.length) return;

    for (const err of errors) {
      if (err.fileUri) continue;

      const stateItems = state.cachedItems;
      for (const item of stateItems) {
        const meta = state.getMeta(item);
        if (!meta?.uri) continue;

        const baseName = meta.uri.fsPath
          .split(/[/\\]/)
          .pop()
          ?.toLowerCase()
          .replace(/\.pks$/, '')
          .replace(/\.pkb$/, '');

        if (!baseName) continue;

        for (const folder of workspaceFolders) {
          const pksPath = vscode.Uri.joinPath(folder.uri, `${baseName}.pks`);
          const pkbPath = vscode.Uri.joinPath(folder.uri, `${baseName}.pkb`);

          try {
            if (
              err.message.toLowerCase().includes('body') ||
              err.message.toLowerCase().includes('package body')
            ) {
              err.fileUri = pkbPath;
            } else {
              err.fileUri = pksPath;
            }
          } catch {
            err.fileUri = meta.uri;
          }
        }
      }
    }
  }

  apply(errors: CompilationError[]) {
    this.diagnosticCollection.clear();

    const byUri = new Map<string, vscode.Diagnostic[]>();
    for (const err of errors) {
      if (!err.fileUri) continue;
      const key = err.fileUri.toString();
      if (!byUri.has(key)) byUri.set(key, []);

      const range = new vscode.Range(
        Math.max(0, err.line - 1),
        Math.max(0, err.column - 1),
        Math.max(0, err.line - 1),
        999,
      );
      const diagnostic = new vscode.Diagnostic(
        range,
        `[${err.code}] ${err.message}`,
        vscode.DiagnosticSeverity.Error,
      );
      diagnostic.source = 'utPLSQL Compilation';
      byUri.get(key)?.push(diagnostic);
    }

    for (const [uri, diagnostics] of byUri) {
      this.diagnosticCollection.set(vscode.Uri.parse(uri), diagnostics);
    }
  }

  clear() {
    this.diagnosticCollection.clear();
  }

  dispose() {
    this.diagnosticCollection.dispose();
  }
}

export const compilationDiagnostics = new CompilationDiagnostics();
