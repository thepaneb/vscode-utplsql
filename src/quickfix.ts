import * as vscode from 'vscode';
import {
  getExtensionLocale,
  readConfig,
  resolveConnection,
  resolveConnectionNoPrompt,
} from './config';
import { t } from './i18n';
import {
  discoverUtplsqlSchema,
  ensurePool,
  findInvalidUt3Objects,
  getOracleInfo,
  parseConnString,
} from './oracleRunner';

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
    const locale = getExtensionLocale();
    const diagnostics: SetupDiagnostic[] = [];
    const cfg = readConfig();
    if (!cfg.setupDiagnosticsEnabled) return diagnostics;

    const conn = await resolveConnection();
    if (conn) {
      let oracledb: typeof import('oracledb');
      try {
        const mod = await import('oracledb');
        oracledb =
          ((mod as Record<string, unknown>).default as typeof import('oracledb')) ??
          (mod as typeof import('oracledb'));
      } catch {
        return diagnostics;
      }

      const pool = await ensurePool(oracledb, conn, cfg).catch(() => undefined);
      let oracleConn: import('oracledb').Connection;
      try {
        oracleConn = pool
          ? await pool.getConnection()
          : await oracledb.getConnection(parseConnString(conn));
      } catch {
        return diagnostics;
      }

      try {
        const info = await getOracleInfo(oracleConn);
        if (info.utVersion && info.dbVersion) {
          const major = parseInt(info.utVersion.replace(/^v/, '').split('.')[0], 10);
          if (major < 3) {
            diagnostics.push({
              code: 'UTPLSQL_OLD_VERSION',
              severity: vscode.DiagnosticSeverity.Warning,
              message: t(locale, 'quickfix.oldVersion', { version: info.utVersion }),
              command: {
                title: t(locale, 'quickfix.oldVersionUpgrade'),
                command: 'vscode.open',
                arguments: [vscode.Uri.parse('https://github.com/utPLSQL/utPLSQL/releases')],
              },
              helpUrl: 'https://github.com/utPLSQL/utPLSQL/releases',
            });
          }
        }
      } finally {
        await oracleConn.close().catch(() => {});
      }
    }

    return diagnostics;
  }

  checkCli(_cliPath: string): boolean {
    return true;
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
      t(getExtensionLocale(), 'quickfix.noCoverage'),
      vscode.DiagnosticSeverity.Warning,
    );
    diag.source = 'utPLSQL Setup';
    diag.code = 'UTPLSQL_NO_COVERAGE';
    this.diagnosticCollection.set(vscode.Uri.parse('utplsql-setup:diagnostics'), [diag]);
  }

  /**
   * Verifica a integridade da instalação do utPLSQL (objetos inválidos no schema
   * UT3). Best-effort: nunca lança, nunca pergunta conexão ao usuário.
   */
  async validateUtplsqlInstall(
    oracledbOverride?: typeof import('oracledb'),
  ): Promise<SetupDiagnostic[]> {
    const cfg = readConfig();
    if (!cfg.setupDiagnosticsEnabled) return [];

    const connStr = resolveConnectionNoPrompt();
    if (!connStr) return [];

    let oracledb: typeof import('oracledb');
    try {
      const mod = oracledbOverride ?? (await import('oracledb'));
      oracledb =
        ((mod as Record<string, unknown>).default as typeof import('oracledb')) ??
        (mod as typeof import('oracledb'));
    } catch {
      return [];
    }

    const issue = await findInvalidUt3Objects(oracledb, connStr, cfg);
    if (!issue || issue.invalid.length === 0) return [];

    const names = issue.invalid.map((i) => `${i.name} (${i.type})`).join(', ');
    return [
      {
        code: 'UTPLSQL_INVALID_OBJECTS',
        severity: vscode.DiagnosticSeverity.Warning,
        message: t(getExtensionLocale(), 'quickfix.invalidObjects', {
          schema: issue.schema,
          count: issue.invalid.length,
          names,
        }),
        command: {
          title: t(getExtensionLocale(), 'quickfix.recompile'),
          command: 'utplsql.recompileUt3',
        },
      },
    ];
  }

  /**
   * Recompila o schema utPLSQL (DBMS_UTILITY.COMPILE_SCHEMA) e re-verifica
   * objetos inválidos. Limpa o diagnostic se resolvido.
   */
  async recompileUt3(oracledbOverride?: typeof import('oracledb')): Promise<void> {
    const cfg = readConfig();
    const locale = getExtensionLocale();
    const connStr = resolveConnectionNoPrompt();
    if (!connStr) {
      vscode.window.showErrorMessage(t(locale, 'quickfix.noConnection'));
      return;
    }

    let oracledb: typeof import('oracledb');
    try {
      const mod = oracledbOverride ?? (await import('oracledb'));
      oracledb =
        ((mod as Record<string, unknown>).default as typeof import('oracledb')) ??
        (mod as typeof import('oracledb'));
    } catch {
      vscode.window.showErrorMessage(t(locale, 'quickfix.oracledbMissing'));
      return;
    }

    try {
      const pool = await ensurePool(oracledb, connStr, cfg).catch(() => undefined);
      const conn = pool
        ? await pool.getConnection()
        : await oracledb.getConnection(parseConnString(connStr));
      try {
        const prefix = await discoverUtplsqlSchema(conn);
        const schema = prefix.replace(/\.$/, '') || 'UT3';
        await conn.execute(
          'BEGIN DBMS_UTILITY.COMPILE_SCHEMA(schema => :schema, compile_all => FALSE); END;',
          { schema },
          { autoCommit: true },
        );

        const issue = await findInvalidUt3Objects(oracledb, connStr, cfg);
        if (!issue || issue.invalid.length === 0) {
          this.removeDiagnostic('UTPLSQL_INVALID_OBJECTS');
          vscode.window.showInformationMessage(t(locale, 'quickfix.recompiledOk', { schema }));
        } else {
          const names = issue.invalid.map((i) => i.name).join(', ');
          vscode.window.showWarningMessage(
            t(locale, 'quickfix.stillInvalid', {
              count: issue.invalid.length,
              schema,
              names,
            }),
          );
        }
      } finally {
        await conn.close().catch(() => {});
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      vscode.window.showErrorMessage(t(locale, 'quickfix.recompileFail', { error: msg }));
    }
  }

  /** Remove do Problems Panel o diagnostic de um código específico (mantém os demais). */
  private removeDiagnostic(code: string) {
    const uri = vscode.Uri.parse('utplsql-setup:diagnostics');
    const existing = this.diagnosticCollection.get(uri);
    if (!existing) return;
    this.diagnosticCollection.set(
      uri,
      existing.filter((d) => d.code !== code),
    );
  }

  /** Diagnósticos atuais do Problems Panel (para verificação pós-ajuste). */
  getDiagnostics(): vscode.Diagnostic[] {
    return [
      ...(this.diagnosticCollection.get(vscode.Uri.parse('utplsql-setup:diagnostics')) ?? []),
    ];
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
    const locale = getExtensionLocale();

    for (const diagnostic of context.diagnostics) {
      if (diagnostic.source !== 'utPLSQL Setup') continue;

      if (diagnostic.code === 'UTPLSQL_BAD_CONN') {
        const title = t(locale, 'quickfix.reconfigureConn');
        const action = new vscode.CodeAction(title, vscode.CodeActionKind.QuickFix);
        action.command = { command: 'utplsql.configureConnection', title };
        action.diagnostics = [diagnostic];
        actions.push(action);
      }

      if (diagnostic.code === 'UTPLSQL_NO_COVERAGE') {
        const title = t(locale, 'quickfix.copyGrants');
        const action = new vscode.CodeAction(title, vscode.CodeActionKind.QuickFix);
        action.command = {
          command: 'utplsql.copyGrantsToClipboard',
          title,
        };
        action.diagnostics = [diagnostic];
        actions.push(action);
      }

      if (diagnostic.code === 'UTPLSQL_INVALID_OBJECTS') {
        const title = t(locale, 'quickfix.recompile');
        const action = new vscode.CodeAction(title, vscode.CodeActionKind.QuickFix);
        action.command = { command: 'utplsql.recompileUt3', title };
        action.diagnostics = [diagnostic];
        actions.push(action);
      }
    }

    return actions;
  }
}

export const setupValidator = new SetupValidator();
