import * as vscode from 'vscode';
import { getActiveProfile, mergeProfileConfig } from './connectionProfiles';
import { type ExtensionLocale, resolveLocale, t } from './i18n';

/** Conexão mantida apenas em memória durante a sessão (quando o usuário digita). */
let sessionConnection: string | undefined;

export interface UtConfig {
  cliPath: string;
  sourcePath: string;
  includePatterns: string[];
  extraRunArgs: string[];
  coverageOwner: string;
  coverageSourceArgs: string[];
  invocation: string;
  javaPath: string;
  javaArgs: string[];
  cliHome: string;
  timeoutMinutes: number;
  dbmsOutput: boolean;
  quiet: boolean;
  failureExitCode: number;
  additionalReporters: string[];
  runnerMode: 'auto' | 'cli' | 'oracle';
  oraclePoolMin: number;
  oraclePoolMax: number;
  oraclePoolIncrement: number;
  oraclePoolPingInterval: number;
  codeLensEnabled: boolean;
  statusBarEnabled: boolean;
  decorationsEnabled: boolean;
  compilationDiagnosticsEnabled: boolean;
  organization: 'file' | 'schema';
  organizationSchemaPattern: string;
  setupDiagnosticsEnabled: boolean;
  sqlCoverageEnabled: boolean;
  debuggerEnabled: boolean;
  debuggerStopOnException: boolean;
  debuggerTimeoutSeconds: number;
  language: 'auto' | 'pt-br' | 'en' | 'es' | 'zh-cn' | 'ja' | 'de' | 'fr';
}

/** Idioma efetivo das mensagens de runtime (setting + idioma do editor). */
export function getExtensionLocale(): ExtensionLocale {
  return resolveLocale(readConfig().language, vscode.env.language);
}

export function readConfig(): UtConfig {
  const c = vscode.workspace.getConfiguration('utplsql');
  const global: UtConfig = {
    cliPath: c.get<string>('cliPath', 'utplsql'),
    sourcePath: c.get<string>('sourcePath', 'install'),
    includePatterns: c.get<string[]>('includePatterns', ['**/*.pks']),
    extraRunArgs: c.get<string[]>('extraRunArgs', []),
    coverageOwner: c.get<string>('coverageOwner', ''),
    coverageSourceArgs: c.get<string[]>('coverageSourceArgs', [
      '-regex_expression=.*[/\\\\](\\w+)[/\\\\](\\w+)\\.sql$',
      '-type_subexpression=1',
      '-name_subexpression=2',
      '-type_mapping=packages=PACKAGE BODY/functions=FUNCTION/procedures=PROCEDURE/triggers=TRIGGER/views=VIEW',
    ]),
    invocation: c.get<string>('invocation', 'launcher'),
    javaPath: c.get<string>('javaPath', 'java'),
    javaArgs: c.get<string[]>('javaArgs', ['-Xmx256m']),
    cliHome: c.get<string>('cliHome', ''),
    timeoutMinutes: c.get<number>('timeoutMinutes', 60),
    dbmsOutput: c.get<boolean>('dbmsOutput', false),
    quiet: c.get<boolean>('quiet', false),
    failureExitCode: c.get<number>('failureExitCode', 1),
    additionalReporters: c.get<string[]>('additionalReporters', []),
    runnerMode: c.get<'auto' | 'cli' | 'oracle'>('runnerMode', 'auto'),
    oraclePoolMin: c.get<number>('oraclePoolMin', 2),
    oraclePoolMax: c.get<number>('oraclePoolMax', 10),
    oraclePoolIncrement: c.get<number>('oraclePoolIncrement', 1),
    oraclePoolPingInterval: c.get<number>('oraclePoolPingInterval', 60),
    codeLensEnabled: c.get<boolean>('codeLens.enabled', true),
    statusBarEnabled: c.get<boolean>('statusBar.enabled', true),
    decorationsEnabled: c.get<boolean>('decorations.enabled', true),
    compilationDiagnosticsEnabled: c.get<boolean>('compilationDiagnostics.enabled', true),
    organization: c.get<'file' | 'schema'>('organization', 'file'),
    organizationSchemaPattern: c.get<string>('organization.schemaPattern', 'db/{schema}/**'),
    setupDiagnosticsEnabled: c.get<boolean>('setupDiagnostics.enabled', true),
    sqlCoverageEnabled: c.get<boolean>('sqlCoverageEnabled', false),
    debuggerEnabled: c.get<boolean>('debugger.enabled', true),
    debuggerStopOnException: c.get<boolean>('debugger.stopOnException', true),
    debuggerTimeoutSeconds: c.get<number>('debugger.timeoutSeconds', 300),
    language: c.get<'auto' | 'pt-br' | 'en' | 'es' | 'zh-cn' | 'ja' | 'de' | 'fr'>(
      'language',
      'auto',
    ),
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
    vscode.commands.executeCommand('setContext', 'utplsql:connected', true);
    return active.connection;
  }
  const fromSetting = vscode.workspace
    .getConfiguration('utplsql')
    .get<string>('connection', '')
    .trim();
  if (fromSetting) {
    vscode.commands.executeCommand('setContext', 'utplsql:connected', true);
    return fromSetting;
  }
  const fromEnv = (process.env.UTPLSQL_CONN ?? '').trim();
  if (fromEnv) {
    vscode.commands.executeCommand('setContext', 'utplsql:connected', true);
    return fromEnv;
  }
  if (sessionConnection) {
    vscode.commands.executeCommand('setContext', 'utplsql:connected', true);
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
    vscode.commands.executeCommand('setContext', 'utplsql:connected', true);
    return sessionConnection;
  }
  return undefined;
}

export function clearSessionConnection(): void {
  sessionConnection = undefined;
  vscode.commands.executeCommand('setContext', 'utplsql:connected', false);
}
