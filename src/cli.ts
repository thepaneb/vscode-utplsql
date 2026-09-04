import * as cp from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
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

/**
 * Só caracteres seguros para a linha de comando do cmd.exe (sem
 * metacaracteres, aspas, espaços, `%` ou `^`).
 */
const CMD_SAFE = /^[A-Za-z0-9_\-.=/:,@\\]+$/;

/**
 * Escapa um argumento para uma linha de arquivo .cmd: `%` vira `%%`
 * (expansão de variável) e o resultado é citado quando contém qualquer
 * coisa fora do conjunto seguro — dentro de aspas, metacaracteres de
 * shell (`|`, `&`, `<`, `>`, `(`) e `^` são literais no batch.
 */
function escapeArgBatch(arg: string): string {
  const escaped = arg.replace(/%/g, '%%');
  return CMD_SAFE.test(arg) ? escaped : `"${escaped}"`;
}

/**
 * Conteúdo de um .cmd intermediário que invoca `file` com `args`.
 * O parser do cmd.exe para invocação de .bat não honra `^` e interpreta
 * `|`, `&`, `<`, `>` como operadores — apenas aspas protegem, e aspas
 * passadas via array de spawn são corrompidas pelo libuv (`\"`), que o
 * cmd.exe não entende. O .cmd resolve: dentro do arquivo, as aspas citam
 * os argumentos com metacaracteres/`%`/`^` corretamente.
 */
export function buildCmdScript(file: string, args: string[]): string {
  const head = escapeArgBatch(file);
  const rest = args.map(escapeArgBatch).join(' ');
  return `@echo off\r\n${rest ? `${head} ${rest}` : head}\r\n`;
}

export function needsCmdScript(file: string, args: string[]): boolean {
  return !CMD_SAFE.test(file) || args.some((a) => !CMD_SAFE.test(a));
}

export interface SpawnPlan {
  command: string;
  args: string[];
  shell: boolean;
  /** Conteúdo do .cmd intermediário, quando necessário (win32 + shell). */
  script?: string;
}

/**
 * Decide como spawnar o CLI. PURO, testável por unidade:
 *  - win32 + shell: `cmd.exe /d /c <file> <args>`; se algum argumento tem
 *    metacaracteres, gera `script` (.cmd) que o runCli escreve em disco.
 *  - outros SO + shell: string única com cada argumento citado para o /bin/sh.
 *  - sem shell (java): passa o array — sem shell, sem quoting.
 */
export function buildCliSpawn(
  file: string,
  args: string[],
  shell: boolean,
  platform: NodeJS.Platform,
): SpawnPlan {
  if (shell) {
    if (platform === 'win32') {
      if (needsCmdScript(file, args)) {
        return { command: 'cmd.exe', args: [], shell: false, script: buildCmdScript(file, args) };
      }
      return { command: 'cmd.exe', args: ['/d', '/c', file, ...args], shell: false };
    }
    return {
      command: [file, ...args].map(quoteArg).join(' '),
      args: [],
      shell: true,
    };
  }
  return { command: file, args, shell: false };
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

    // shell=true (launcher .bat/script): buildCliSpawn cita cada argumento para
    // o shell (cmd.exe no Windows interpreta |, &, (, ), espaços etc.).
    // shell=false (java direto): passa o array — sem shell, sem quoting,
    // metacaracteres de regex passam literais.
    const plan = buildCliSpawn(file, args, shell, process.platform);

    let scriptDir: string | undefined;
    let scriptPath: string | undefined;
    if (plan.script) {
      scriptDir = fs.mkdtempSync(path.join(os.tmpdir(), 'utplsql-cmd-'));
      scriptPath = path.join(scriptDir, 'run.cmd');
      fs.writeFileSync(scriptPath, plan.script);
    }

    const child = cp.spawn(plan.command, scriptPath ? ['/d', '/c', scriptPath] : plan.args, {
      cwd,
      shell: plan.shell,
      windowsHide: true,
    });

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

    const cleanup = () => {
      if (scriptDir) {
        try {
          fs.rmSync(scriptDir, { recursive: true, force: true });
        } catch {
          /* ignore */
        }
      }
    };

    child.on('error', (err) => {
      killSub.dispose();
      void Promise.all([outSink.waitIdle(), errSink.waitIdle()]).then(() => {
        cleanup();
        resolve({ code: -1, stdout, stderr: `${stderr}\n${String(err)}` });
      });
    });

    child.on('close', (code) => {
      killSub.dispose();
      void Promise.all([outSink.waitIdle(), errSink.waitIdle()]).then(() => {
        cleanup();
        resolve({ code: code ?? -1, stdout, stderr });
      });
    });
  });
}
