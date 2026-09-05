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
  id: string; // UUID
  name: string;
  connection: string; // user/pass@//host:port/service
  sourcePath?: string;
  coverageOwner?: string;
  coverageSourceArgs?: string[];
  includePatterns?: string[];
  invocation?: 'launcher' | 'java';
  cliPath?: string;
  cliHome?: string;
  javaPath?: string;
  extraRunArgs?: string[];
  isDefault?: boolean;
  lastUsed?: string;
}
