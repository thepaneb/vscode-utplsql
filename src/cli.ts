import * as cp from 'node:child_process';
import type * as vscode from 'vscode';

export interface CliResult {
  code: number;
  stdout: string;
  stderr: string;
}

function quoteArg(arg: string): string {
  // Em Windows usamos shell: true (para resolver .bat/.cmd e o PATH),
  // então protegemos argumentos com espaços ou caracteres especiais.
  if (/[\s"&|<>^()]/.test(arg)) {
    return `"${arg.replace(/"/g, '\\"')}"`;
  }
  return arg;
}

/**
 * Executa o utPLSQL-cli. A string de conexão NÃO é logada.
 * onStdout é chamado em streaming para exibir o reporter de documentação na view de testes.
 */
export function runCli(
  file: string,
  args: string[],
  shell: boolean,
  cwd: string,
  token: vscode.CancellationToken,
  onStdout?: (chunk: string) => void,
): Promise<CliResult> {
  return new Promise((resolve) => {
    // shell=true (launcher .bat/script): junta tudo numa string e cita os args
    // (necessário com shell). shell=false (java direto): passa o array — sem cmd,
    // sem quoting, metacaracteres de regex passam literais.
    const child = shell
      ? cp.spawn([file, ...args].map(quoteArg).join(' '), { cwd, shell: true, windowsHide: true })
      : cp.spawn(file, args, { cwd, shell: false, windowsHide: true });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (d: Buffer) => {
      const s = d.toString();
      stdout += s;
      onStdout?.(s);
    });
    child.stderr.on('data', (d: Buffer) => {
      stderr += d.toString();
    });

    const killSub = token.onCancellationRequested(() => {
      try {
        child.kill();
      } catch {
        /* ignore */
      }
    });

    child.on('error', (err) => {
      killSub.dispose();
      resolve({ code: -1, stdout, stderr: `${stderr}\n${String(err)}` });
    });

    child.on('close', (code) => {
      killSub.dispose();
      resolve({ code: code ?? -1, stdout, stderr });
    });
  });
}
