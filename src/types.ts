import type * as vscode from 'vscode';

export type ItemMeta =
  | { kind: 'suite'; packageName: string; uri: vscode.Uri }
  | { kind: 'test'; packageName: string; procName: string; description: string; uri: vscode.Uri };
