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

/** Encoding para ler/decodificar arquivos de script (PRD-62). */
export type ProfileCharset = 'utf8' | 'latin1' | 'win1252';

/** Perfil de conexão Oracle salvo em `utplsql.profiles`. */
export interface ConnectionProfile {
  id: string;
  name: string;
  connection: string;
  /** Descrição amigável exibida no picker de conexão (PRD-62). */
  description?: string;
  /** Encoding dos scripts; ausente = `utf8` (PRD-62). */
  charset?: ProfileCharset;
  sourcePath?: string;
  coverageOwner?: string;
  includePatterns?: string[];
  isDefault?: boolean;
  lastUsed?: string;
}
