import * as vscode from 'vscode';

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
  cliHome: string;
  timeoutMinutes: number;
  dbmsOutput: boolean;
  quiet: boolean;
  failureExitCode: number;
  additionalReporters: string[];
}

export function readConfig(): UtConfig {
  const c = vscode.workspace.getConfiguration('utplsql');
  return {
    cliPath: c.get<string>('cliPath', 'utplsql'),
    sourcePath: c.get<string>('sourcePath', 'install'),
    includePatterns: c.get<string[]>('includePatterns', ['**/*.pks']),
    extraRunArgs: c.get<string[]>('extraRunArgs', []),
    coverageOwner: c.get<string>('coverageOwner', ''),
    coverageSourceArgs: c.get<string[]>('coverageSourceArgs', [
      '-regex_expression=.*[/\\\\](\\w+)[/\\\\](\\w+)\\.sql$',
      '-type_subexpression=1',
      '-name_subexpression=2',
      '-type_mapping=packages=PACKAGE BODY/functions=FUNCTION/procedures=PROCEDURE/triggers=TRIGGER',
    ]),
    invocation: c.get<string>('invocation', 'launcher'),
    javaPath: c.get<string>('javaPath', 'java'),
    cliHome: c.get<string>('cliHome', ''),
    timeoutMinutes: c.get<number>('timeoutMinutes', 60),
    dbmsOutput: c.get<boolean>('dbmsOutput', false),
    quiet: c.get<boolean>('quiet', false),
    failureExitCode: c.get<number>('failureExitCode', 1),
    additionalReporters: c.get<string[]>('additionalReporters', []),
  };
}

/**
 * Resolve a string de conexão na ordem:
 *   1) setting utplsql.connection
 *   2) variável de ambiente UTPLSQL_CONN
 *   3) cache da sessão (se já perguntamos antes)
 *   4) pergunta ao usuário (e guarda só na sessão)
 */
export async function resolveConnection(): Promise<string | undefined> {
  const fromSetting = vscode.workspace
    .getConfiguration('utplsql')
    .get<string>('connection', '')
    .trim();
  if (fromSetting) {
    return fromSetting;
  }
  const fromEnv = (process.env.UTPLSQL_CONN ?? '').trim();
  if (fromEnv) {
    return fromEnv;
  }
  if (sessionConnection) {
    return sessionConnection;
  }
  const input = await vscode.window.showInputBox({
    title: 'utPLSQL — conexão Oracle',
    prompt: 'Informe a conexão (usuario/senha@//host:porta/servico). Fica só nesta sessão.',
    placeHolder: 'DEV_FULANO/senha@//localhost:1521/XEPDB1',
    password: true,
    ignoreFocusOut: true,
  });
  if (input?.trim()) {
    sessionConnection = input.trim();
    return sessionConnection;
  }
  return undefined;
}

export function clearSessionConnection(): void {
  sessionConnection = undefined;
}
