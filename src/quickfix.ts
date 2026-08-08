import * as fs from 'node:fs';
import * as vscode from 'vscode';
import { getCliInfo, semverLt } from './cliInfo';
import { readConfig, resolveConnection } from './config';

interface SetupDiagnostic {
  code: string;
  severity: vscode.DiagnosticSeverity;
  message: string;
  command?: { title: string; command: string; arguments?: unknown[] };
  helpUrl?: string;
}

export class SetupValidator {
  private diagnosticCollection: vscode.DiagnosticCollection;

  constructor() {
    this.diagnosticCollection = vscode.languages.createDiagnosticCollection('utplsql-setup');
  }

  async validateOnActivation(): Promise<SetupDiagnostic[]> {
    const diagnostics: SetupDiagnostic[] = [];
    const cfg = readConfig();
    if (!cfg.setupDiagnosticsEnabled) return diagnostics;

    const cliExists = this.checkCli(cfg.cliPath);
    if (!cliExists) {
      diagnostics.push({
        code: 'UTPLSQL_NO_CLI',
        severity: vscode.DiagnosticSeverity.Error,
        message: `utPLSQL CLI não encontrado em "${cfg.cliPath}". Instale via npm: npm install -g utplsql-cli ou ajuste utplsql.cliPath.`,
        command: {
          title: 'Configurar utplsql.cliPath',
          command: 'workbench.action.openSettings',
          arguments: ['utplsql.cliPath'],
        },
      });
    }

    if (cfg.invocation === 'java' && cfg.javaPath) {
      try {
        fs.accessSync(cfg.javaPath, fs.constants.X_OK);
      } catch {
        const ext = process.platform === 'win32' ? '.exe' : '';
        diagnostics.push({
          code: 'UTPLSQL_NO_JAVA',
          severity: vscode.DiagnosticSeverity.Error,
          message: `Java não encontrado em "${cfg.javaPath}${ext}". Instale o JDK ou ajuste utplsql.javaPath.`,
          command: {
            title: 'Configurar utplsql.javaPath',
            command: 'workbench.action.openSettings',
            arguments: ['utplsql.javaPath'],
          },
        });
      }
    }

    if (cliExists) {
      const conn = await resolveConnection();
      if (conn) {
        const info = await getCliInfo(cfg, conn);
        if ('error' in info) {
          diagnostics.push({
            code: 'UTPLSQL_BAD_CONN',
            severity: vscode.DiagnosticSeverity.Error,
            message: `Falha ao conectar: ${info.error}. Verifique utplsql.connection ou env UTPLSQL_CONN.`,
            command: {
              title: 'Reconfigurar conexão',
              command: 'utplsql.configureConnection',
            },
          });
        } else if (info.dbVersion && semverLt(info.dbVersion, '3.1.0')) {
          diagnostics.push({
            code: 'UTPLSQL_OLD_VERSION',
            severity: vscode.DiagnosticSeverity.Warning,
            message: `Versão utPLSQL no banco (${info.dbVersion}) é anterior a 3.1.0. Cobertura pode não funcionar.`,
            command: {
              title: 'Como atualizar o utPLSQL',
              command: 'vscode.open',
              arguments: [vscode.Uri.parse('https://github.com/utPLSQL/utPLSQL/releases')],
            },
            helpUrl: 'https://github.com/utPLSQL/utPLSQL/releases',
          });
        }
      }
    }

    return diagnostics;
  }

  checkCli(cliPath: string): boolean {
    try {
      fs.accessSync(cliPath, fs.constants.X_OK);
      return true;
    } catch {
      return false;
    }
  }

  applyDiagnostics(diagnostics: SetupDiagnostic[]) {
    this.diagnosticCollection.clear();
    if (diagnostics.length === 0) return;

    const groups = new Map<string, vscode.Diagnostic[]>();
    for (const d of diagnostics) {
      const uri = vscode.Uri.parse(`utplsql-setup:diagnostics`);
      const key = uri.toString();
      if (!groups.has(key)) groups.set(key, []);

      const range = new vscode.Range(0, 0, 0, 0);
      const diag = new vscode.Diagnostic(range, d.message, d.severity);
      diag.source = 'utPLSQL Setup';
      diag.code = d.code;

      groups.get(key)?.push(diag);
    }

    for (const [uri, diags] of groups) {
      this.diagnosticCollection.set(vscode.Uri.parse(uri), diags);
    }
  }

  addCoverageDiagnostic() {
    const diag = new vscode.Diagnostic(
      new vscode.Range(0, 0, 0, 0),
      'Relatório de cobertura não foi gerado. Execute os grants: GRANT EXECUTE ON SYS.DBMS_PROFILER TO <schema>;',
      vscode.DiagnosticSeverity.Warning,
    );
    diag.source = 'utPLSQL Setup';
    diag.code = 'UTPLSQL_NO_COVERAGE';
    this.diagnosticCollection.set(vscode.Uri.parse('utplsql-setup:diagnostics'), [diag]);
  }

  clear() {
    this.diagnosticCollection.clear();
  }

  dispose() {
    this.diagnosticCollection.dispose();
  }
}

export class UtplsqlCodeActionProvider implements vscode.CodeActionProvider {
  provideCodeActions(
    _document: vscode.TextDocument,
    _range: vscode.Range,
    context: vscode.CodeActionContext,
    _token: vscode.CancellationToken,
  ): vscode.CodeAction[] {
    const actions: vscode.CodeAction[] = [];

    for (const diagnostic of context.diagnostics) {
      if (diagnostic.source !== 'utPLSQL Setup') continue;

      if (diagnostic.code === 'UTPLSQL_NO_CLI') {
        const action = new vscode.CodeAction(
          'Configurar utplsql.cliPath',
          vscode.CodeActionKind.QuickFix,
        );
        action.command = {
          command: 'workbench.action.openSettings',
          title: 'Configurar utplsql.cliPath',
          arguments: ['utplsql.cliPath'],
        };
        action.diagnostics = [diagnostic];
        actions.push(action);
      }

      if (diagnostic.code === 'UTPLSQL_BAD_CONN') {
        const action = new vscode.CodeAction(
          'Reconfigurar conexão',
          vscode.CodeActionKind.QuickFix,
        );
        action.command = { command: 'utplsql.configureConnection', title: 'Reconfigurar conexão' };
        action.diagnostics = [diagnostic];
        actions.push(action);
      }

      if (diagnostic.code === 'UTPLSQL_NO_COVERAGE') {
        const action = new vscode.CodeAction(
          'Copiar grants para clipboard',
          vscode.CodeActionKind.QuickFix,
        );
        action.command = {
          command: 'utplsql.copyGrantsToClipboard',
          title: 'Copiar grants',
        };
        action.diagnostics = [diagnostic];
        actions.push(action);
      }
    }

    return actions;
  }
}

export const setupValidator = new SetupValidator();
