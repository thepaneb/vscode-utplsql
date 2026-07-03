import * as path from 'node:path';

// Monta como o utPLSQL-cli será invocado. PURO (sem 'vscode'), testável por unidade.

/** Subconjunto do UtConfig usado para decidir a invocação. */
export interface InvocationConfig {
  invocation: string; // 'launcher' | 'java'
  cliPath: string;
  javaPath: string;
  cliHome: string;
}

export interface Spawn {
  file: string;
  args: string[];
  shell: boolean;
}

export interface InvocationError {
  error: string;
}

/** Classe principal do utPLSQL-cli (ver bin/utplsql.bat). */
export const UTPLSQL_MAIN_CLASS = 'org.utplsql.cli.Cli';

/**
 * Raiz do utPLSQL-cli para o modo `java`.
 * Usa `cliHome` se definido; senão deriva de `cliPath` (`<home>/bin/utplsql.bat` → `<home>`).
 * Retorna undefined quando `cliPath` é só um nome de comando (ex.: "utplsql").
 */
export function resolveCliHome(cfg: InvocationConfig): string | undefined {
  const home = (cfg.cliHome || '').trim();
  if (home) {
    return home;
  }
  const p = cfg.cliPath;
  if (p && /[\\/]/.test(p)) {
    return path.dirname(path.dirname(p)); // .../bin/utplsql(.bat) -> raiz
  }
  return undefined;
}

/**
 * Decide como rodar o cli:
 *  - 'launcher' (default): via o launcher (.bat/script) com shell.
 *  - 'java': chama a JVM direto (sem shell), evitando o cmd e os metacaracteres.
 */
export function buildInvocation(cfg: InvocationConfig, cliArgs: string[]): Spawn | InvocationError {
  if (cfg.invocation !== 'java') {
    return { file: cfg.cliPath, args: cliArgs, shell: true };
  }

  const home = resolveCliHome(cfg);
  if (!home) {
    return {
      error:
        "Modo 'java': não foi possível determinar a raiz do utPLSQL-cli. " +
        "Defina 'utplsql.cliHome' ou aponte 'utplsql.cliPath' para .../bin/utplsql(.bat).",
    };
  }

  const classpath = [path.join(home, 'etc'), path.join(home, 'lib', '*')].join(path.delimiter);
  const file = (cfg.javaPath || '').trim() || 'java';
  const args = [
    '-cp',
    classpath,
    '-Dapp.name=utplsql',
    `-Dapp.home=${home}`,
    `-Dapp.repo=${path.join(home, 'lib')}`,
    `-Dbasedir=${home}`,
    UTPLSQL_MAIN_CLASS,
    ...cliArgs,
  ];
  return { file, args, shell: false };
}

export function isInvocationError(x: Spawn | InvocationError): x is InvocationError {
  return (x as InvocationError).error !== undefined;
}
