import * as vscode from 'vscode';
import { getActiveProfile, getProfileConnection, mergeProfileConfig } from './connectionProfiles';
import { type ExtensionLocale, resolveLocale, t } from './i18n';
import { resolveTnsAdminPath } from './tnsnames';

/** Conexão mantida apenas em memória durante a sessão (quando o usuário digita). */
let sessionConnection: string | undefined;

export interface UtConfig {
  sourcePath: string;
  includePatterns: string[];
  coverageOwner: string;
  coverageSchemes: string[];
  coverageIncludeObjects: string[];
  coverageExcludeObjects: string[];
  coverageIncludeSchemaExpr: string;
  coverageIncludeObjectExpr: string;
  coverageExcludeSchemaExpr: string;
  coverageExcludeObjectExpr: string;
  tags: string;
  randomOrder: boolean;
  randomOrderSeed: number;
  additionalReporters: string[];
  reporterClientCharacterSet: string;
  reporterColorConsole: boolean;
  timeoutMinutes: number;
  dbmsOutput: boolean;
  oraclePoolMin: number;
  oraclePoolMax: number;
  oraclePoolIncrement: number;
  oraclePoolPingInterval: number;
  oracleClientMode: 'thin' | 'thick';
  oracleClientLibDir: string;
  oracleClientConfigDir: string;
  /** Diretório do `tnsnames.ora` resolvido para o thin (PRD-82). */
  tnsAdminPath: string;
  /** Wallet do perfil ativo: localização e senha (PRD-82). */
  walletLocation: string;
  walletPassword: string;
  codeLensEnabled: boolean;
  statusBarEnabled: boolean;
  decorationsEnabled: boolean;
  compilationDiagnosticsEnabled: boolean;
  /** Sufixa `[tag]` no label dos TestItems (PRD-51 RF4). */
  showTagsInTree: boolean;
  organization: 'file' | 'schema' | 'tag';
  organizationSchemaPattern: string;
  discoverySource: 'auto' | 'file' | 'database';
  refreshDebounceMs: number;
  setupDiagnosticsEnabled: boolean;
  sqlCoverageEnabled: boolean;
  debuggerEnabled: boolean;
  debuggerStopOnException: boolean;
  debuggerTimeoutSeconds: number;
  debuggerCompileOnDebug: boolean;
  scriptRunnerStopOnError: boolean;
  scriptRunnerAutoCommit: boolean;
  scriptRunnerFilePattern: string;
  scriptRunnerDbmsOutput: boolean;
  scriptRunnerTimeoutSeconds: number;
  language:
    | 'auto'
    | 'pt-br'
    | 'en'
    | 'en-gb'
    | 'es'
    | 'zh-cn'
    | 'zh-tw'
    | 'ja'
    | 'de'
    | 'fr'
    | 'it'
    | 'ko'
    | 'ru'
    | 'tr'
    | 'pl'
    | 'cs'
    | 'hu'
    | 'bg'
    | 'el'
    | 'id'
    | 'ro'
    | 'sr'
    | 'th'
    | 'uk'
    | 'vi';
}

/** Idioma efetivo das mensagens de runtime (setting + idioma do editor). */
export function getExtensionLocale(): ExtensionLocale {
  return resolveLocale(readConfig().language, vscode.env.language);
}

/**
 * Valor **user/machine** de `sqldeveloper.connections.tnsConfiguration.path`
 * (fallback do TNS admin). Nunca considera o valor do workspace (PRD-81/PRD-82).
 */
function sqlDevTnsPath(): string | undefined {
  const inspected = vscode.workspace
    .getConfiguration('sqldeveloper')
    .inspect<string>('connections.tnsConfiguration.path');
  return inspected?.globalValue ?? undefined;
}

export function readConfig(): UtConfig {
  const c = vscode.workspace.getConfiguration('utplsql');
  const global: UtConfig = {
    sourcePath: c.get<string>('sourcePath', 'install'),
    includePatterns: c.get<string[]>('includePatterns', ['**/*.pks']),
    coverageOwner: c.get<string>('coverageOwner', ''),
    coverageSchemes: c.get<string[]>('coverage.schemes', []),
    coverageIncludeObjects: c.get<string[]>('coverage.includeObjects', []),
    coverageExcludeObjects: c.get<string[]>('coverage.excludeObjects', []),
    coverageIncludeSchemaExpr: c.get<string>('coverage.includeSchemaExpr', ''),
    coverageIncludeObjectExpr: c.get<string>('coverage.includeObjectExpr', ''),
    coverageExcludeSchemaExpr: c.get<string>('coverage.excludeSchemaExpr', ''),
    coverageExcludeObjectExpr: c.get<string>('coverage.excludeObjectExpr', ''),
    tags: c.get<string>('tags', ''),
    randomOrder: c.get<boolean>('run.randomOrder', false),
    randomOrderSeed: c.get<number>('run.randomOrderSeed', 0),
    additionalReporters: c.get<string[]>('additionalReporters', []),
    reporterClientCharacterSet: c.get<string>('reporter.clientCharacterSet', ''),
    reporterColorConsole: c.get<boolean>('reporter.colorConsole', false),
    timeoutMinutes: c.get<number>('timeoutMinutes', 60),
    dbmsOutput: c.get<boolean>('dbmsOutput', false),
    oraclePoolMin: c.get<number>('oraclePoolMin', 2),
    oraclePoolMax: c.get<number>('oraclePoolMax', 10),
    oraclePoolIncrement: c.get<number>('oraclePoolIncrement', 1),
    oraclePoolPingInterval: c.get<number>('oraclePoolPingInterval', 60),
    oracleClientMode: c.get<'thin' | 'thick'>('oracleClientMode', 'thin'),
    oracleClientLibDir: c.get<string>('oracleClientLibDir', ''),
    oracleClientConfigDir: c.get<string>('oracleClientConfigDir', ''),
    tnsAdminPath:
      resolveTnsAdminPath(
        c.get<string>('connections.tnsAdminPath', ''),
        sqlDevTnsPath(),
        process.env.TNS_ADMIN,
      ) ?? '',
    walletLocation: '',
    walletPassword: '',
    codeLensEnabled: c.get<boolean>('codeLens.enabled', true),
    statusBarEnabled: c.get<boolean>('statusBar.enabled', true),
    decorationsEnabled: c.get<boolean>('decorations.enabled', true),
    compilationDiagnosticsEnabled: c.get<boolean>('compilationDiagnostics.enabled', true),
    showTagsInTree: c.get<boolean>('showTagsInTree', false),
    organization: c.get<'file' | 'schema' | 'tag'>('organization', 'file'),
    organizationSchemaPattern: c.get<string>('organization.schemaPattern', 'db/{schema}/**'),
    discoverySource: c.get<'auto' | 'file' | 'database'>('discovery.source', 'auto'),
    refreshDebounceMs: c.get<number>('refreshDebounceMs', 300),
    setupDiagnosticsEnabled: c.get<boolean>('setupDiagnostics.enabled', true),
    sqlCoverageEnabled: c.get<boolean>('sqlCoverageEnabled', false),
    debuggerEnabled: c.get<boolean>('debugger.enabled', true),
    debuggerStopOnException: c.get<boolean>('debugger.stopOnException', true),
    debuggerTimeoutSeconds: c.get<number>('debugger.timeoutSeconds', 300),
    debuggerCompileOnDebug: c.get<boolean>('debugger.compileOnDebug', false),
    scriptRunnerStopOnError: c.get<boolean>('scriptRunner.stopOnError', true),
    scriptRunnerAutoCommit: c.get<boolean>('scriptRunner.autoCommit', true),
    scriptRunnerFilePattern: c.get<string>(
      'scriptRunner.filePattern',
      '**/*.{sql,pks,pkb,fnc,prc,trg}',
    ),
    scriptRunnerDbmsOutput: c.get<boolean>('scriptRunner.dbmsOutput', false),
    scriptRunnerTimeoutSeconds: c.get<number>('scriptRunner.timeoutSeconds', 300),
    language: c.get<
      | 'auto'
      | 'pt-br'
      | 'en'
      | 'en-gb'
      | 'es'
      | 'zh-cn'
      | 'zh-tw'
      | 'ja'
      | 'de'
      | 'fr'
      | 'it'
      | 'ko'
      | 'ru'
      | 'tr'
      | 'pl'
      | 'cs'
      | 'hu'
      | 'bg'
      | 'el'
      | 'id'
      | 'ro'
      | 'sr'
      | 'th'
      | 'uk'
      | 'vi'
    >('language', 'auto'),
  };
  return mergeProfileConfig(global, getActiveProfile());
}

/**
 * Resolve a string de conexão sem interagir com o usuário:
 *   1) perfil ativo (utplsql.activeProfile)
 *   2) setting utplsql.connection
 *   3) variável de ambiente UTPLSQL_CONN
 *   4) cache da sessão
 * Retorna undefined se nada configurado (não mostra prompt).
 */
export function resolveConnectionNoPrompt(): string | undefined {
  const active = getActiveProfile();
  if (active?.connection) {
    void vscode.commands.executeCommand('setContext', 'utplsql:connected', true);
    return getProfileConnection(active);
  }
  const fromSetting = vscode.workspace
    .getConfiguration('utplsql')
    .get<string>('connection', '')
    .trim();
  if (fromSetting) {
    void vscode.commands.executeCommand('setContext', 'utplsql:connected', true);
    return fromSetting;
  }
  const fromEnv = (process.env.UTPLSQL_CONN ?? '').trim();
  if (fromEnv) {
    void vscode.commands.executeCommand('setContext', 'utplsql:connected', true);
    return fromEnv;
  }
  if (sessionConnection) {
    void vscode.commands.executeCommand('setContext', 'utplsql:connected', true);
    return sessionConnection;
  }
  return undefined;
}

/**
 * Resolve a string de conexão na ordem:
 *   1) perfil ativo (utplsql.activeProfile)
 *   2) setting utplsql.connection
 *   3) variável de ambiente UTPLSQL_CONN
 *   4) cache da sessão (se já perguntamos antes)
 *   5) pergunta ao usuário (e guarda só na sessão)
 */
export async function resolveConnection(): Promise<string | undefined> {
  const existing = resolveConnectionNoPrompt();
  if (existing) return existing;

  const input = await vscode.window.showInputBox({
    title: 'utPLSQL',
    prompt: t(getExtensionLocale(), 'ext.conn.prompt'),
    placeHolder: t(getExtensionLocale(), 'ext.conn.placeholder'),
    password: true,
    ignoreFocusOut: true,
  });
  if (input?.trim()) {
    sessionConnection = input.trim();
    void vscode.commands.executeCommand('setContext', 'utplsql:connected', true);
    return sessionConnection;
  }
  return undefined;
}

export function clearSessionConnection(): void {
  sessionConnection = undefined;
  void vscode.commands.executeCommand('setContext', 'utplsql:connected', false);
}
