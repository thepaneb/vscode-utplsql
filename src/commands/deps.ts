import type * as vscode from 'vscode';
import type { DecorationManager } from '../decorations';
import type { TestStateManager } from '../state';
import type { UtplsqlStatusBar } from '../statusBar';

/** Dependências compartilhadas injetadas nos módulos de comando (RF1). */
export interface CommandDeps {
  controller: vscode.TestController;
  state: TestStateManager;
  getStatusBar(): UtplsqlStatusBar | undefined;
  getDecorationManager(): DecorationManager | undefined;
  refresh(): Promise<void>;
}
