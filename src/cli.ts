import * as cp from 'child_process';
import * as vscode from 'vscode';

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
  cliPath: string,
  args: string[],
  cwd: string,
  token: vscode.CancellationToken,
  onStdout?: (chunk: string) => void
): Promise<CliResult> {
  return new Promise((resolve) => {
    const cmd = [cliPath, ...args].map(quoteArg).join(' ');
    const child = cp.spawn(cmd, {
      cwd,
      shell: true,
      windowsHide: true
    });

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
      resolve({ code: -1, stdout, stderr: stderr + '\n' + String(err) });
    });

    child.on('close', (code) => {
      killSub.dispose();
      resolve({ code: code ?? -1, stdout, stderr });
    });
  });
}
