import type * as vscode from 'vscode';

export type ItemMeta =
  | { kind: 'suite'; packageName: string; uri: vscode.Uri; folder: vscode.WorkspaceFolder }
  | {
      kind: 'test';
      packageName: string;
      procName: string;
      description: string;
      uri: vscode.Uri;
      folder: vscode.WorkspaceFolder;
    };

/** Perfil de conexão Oracle salvo em `utplsql.profiles`. */
export interface ConnectionProfile {
  id: string;
  name: string;
  connection: string;
  sourcePath?: string;
  coverageOwner?: string;
  includePatterns?: string[];
  isDefault?: boolean;
  lastUsed?: string;
}
