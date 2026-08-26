import * as cp from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import type * as vscode from 'vscode';
import {
  DEFAULT_WINDOWS_CODEPAGES,
  decodeCliBuffer,
  parseRegCodePage,
  type WindowsCodepages,
} from './cliEncoding';

export interface CliResult {
  code: number;
  stdout: string;
  stderr: string;
}

export function quoteArg(arg: string): string {
  // Em Windows usamos shell: true (para resolver .bat/.cmd e o PATH),
  // então protegemos argumentos com espaços ou caracteres especiais.
  if (/[\s"&|<>^()$`]/.test(arg)) {
    return `"${arg.replace(/"/g, '\\"')}"`;
  }
  return arg;
}

// Codepages do Windows, lidos uma única vez por sessão (reg.exe).
let windowsCodepages: Promise<WindowsCodepages> | null = null;

function getWindowsCodepages(): Promise<WindowsCodepages> {
  windowsCodepages ??= new Promise((resolve) => {
    cp.execFile(
      'reg.exe',
      ['query', 'HKLM\\SYSTEM\\CurrentControlSet\\Control\\Nls\\CodePage'],
      { windowsHide: true, encoding: 'buffer', timeout: 5000 },
      (err, stdout) => {
        if (err) {
          resolve(DEFAULT_WINDOWS_CODEPAGES);
          return;
        }
        const text = stdout.toString('utf8');
        const acp = parseRegCodePage(text, 'ACP');
        const oemcp = parseRegCodePage(text, 'OEMCP');
        resolve(acp && oemcp ? { acp, oemcp } : DEFAULT_WINDOWS_CODEPAGES);
      },
    );
  });
  return windowsCodepages;
}

/**
 * Sink de chunks de stdout/stderr: decodifica como UTF-8; ao achar bytes
 * inválidos no Windows, troca para os codepages do sistema (ANSI/OEM).
 * Chunks aguardando o fallback ficam bufferizados, preservando a ordem.
 */
function makeStreamSink(emit: (text: string) => void): {
  feed: (d: Buffer) => void;
  waitIdle: () => Promise<void>;
} {
  const utf8 = new TextDecoder('utf-8', { fatal: false });
  let fallback: ((buf: Buffer) => string) | null = null;
  const pending: Buffer[] = [];
  const pendingFlush: Promise<void>[] = [];

  const flushPending = () => {
    if (!fallback) return;
    for (const buf of pending.splice(0)) {
      emit(fallback(buf));
    }
  };

  const feed = (d: Buffer) => {
    if (fallback) {
      emit(fallback(d));
      return;
    }
    const text = utf8.decode(d, { stream: true });
    if (!text.includes('\uFFFD')) {
      emit(text);
      return;
    }
    pending.push(d);
    if (process.platform !== 'win32') {
      fallback = (buf) => buf.toString('utf8');
      flushPending();
      return;
    }
    pendingFlush.push(
      getWindowsCodepages().then((cps) => {
        fallback = (buf) => decodeCliBuffer(buf, cps);
        flushPending();
      }),
    );
  };

  return {
    feed,
    waitIdle: async () => {
      await Promise.all(pendingFlush);
    },
  };
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
    // Caminho explícito inexistente: responde com erro limpo em vez de spawnar
    // o cmd.exe, cuja mensagem localizada sairia no codepage OEM.
    if (/[\\/]/.test(file) && !fs.existsSync(path.resolve(cwd, file))) {
      resolve({ code: -1, stdout: '', stderr: `CLI não encontrado: ${file}` });
      return;
    }

    // shell=true (launcher .bat/script): junta tudo numa string e cita os args
    // (necessário com shell). shell=false (java direto): passa o array — sem cmd,
    // sem quoting, metacaracteres de regex passam literais.
    const child = shell
      ? process.platform === 'win32'
        ? cp.spawn('cmd.exe', ['/d', '/c', file, ...args], {
            cwd,
            shell: false,
            windowsHide: true,
          })
        : cp.spawn([file, ...args].map(quoteArg).join(' '), { cwd, shell: true, windowsHide: true })
      : cp.spawn(file, args, { cwd, shell: false, windowsHide: true });

    let stdout = '';
    let stderr = '';

    const outSink = makeStreamSink((s) => {
      stdout += s;
      onStdout?.(s);
    });
    const errSink = makeStreamSink((s) => {
      stderr += s;
    });
    child.stdout.on('data', outSink.feed);
    child.stderr.on('data', errSink.feed);

    const killSub = token.onCancellationRequested(() => {
      try {
        child.kill();
      } catch {
        /* ignore */
      }
    });

    child.on('error', (err) => {
      killSub.dispose();
      void Promise.all([outSink.waitIdle(), errSink.waitIdle()]).then(() => {
        resolve({ code: -1, stdout, stderr: `${stderr}\n${String(err)}` });
      });
    });

    child.on('close', (code) => {
      killSub.dispose();
      void Promise.all([outSink.waitIdle(), errSink.waitIdle()]).then(() => {
        resolve({ code: code ?? -1, stdout, stderr });
      });
    });
  });
}
