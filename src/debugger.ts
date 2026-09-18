import * as fs from 'node:fs';
import * as vscode from 'vscode';
import { getExtensionLocale, readConfig, resolveConnectionNoPrompt } from './config';
import {
  type BreakpointTarget,
  DbmsDebugClient,
  type DebugBindCodes,
  type DebugConnection,
  parseBreakpointTarget,
} from './dbmsDebug';
import { t } from './i18n';
import { connectionUser, ensurePool, parseConnString } from './oracleRunner';

// ---------------------------------------------------------------------------
// Contratos injetáveis (testáveis com fake)
// ---------------------------------------------------------------------------

export interface DebuggerRuntime {
  acquireConnection(): Promise<DebugConnection | undefined>;
  runTest(conn: DebugConnection, packageName: string, testName?: string): Promise<void>;
}

async function loadOracledb(): Promise<typeof import('oracledb') | undefined> {
  try {
    const mod = await import('oracledb');
    return (
      ((mod as Record<string, unknown>).default as typeof import('oracledb')) ??
      (mod as typeof import('oracledb'))
    );
  } catch {
    return undefined;
  }
}

let bindCodesPromise: Promise<DebugBindCodes | undefined> | undefined;

/** Constantes de bind do driver (para os OUT binds do DBMS_DEBUG). */
function loadBindCodes(): Promise<DebugBindCodes | undefined> {
  if (!bindCodesPromise) {
    bindCodesPromise = loadOracledb().then((oracledb) =>
      oracledb
        ? { BIND_OUT: oracledb.BIND_OUT, STRING: oracledb.STRING, NUMBER: oracledb.NUMBER }
        : undefined,
    );
  }
  return bindCodesPromise;
}

/** Implementação real: conexões via pool/raw + ut_runner.run no debuggee. */
export const liveRuntime: DebuggerRuntime = {
  async acquireConnection(): Promise<DebugConnection | undefined> {
    const oracledb = await loadOracledb();
    if (!oracledb) return undefined;
    const connection = resolveConnectionNoPrompt();
    if (!connection) return undefined;
    const cfg = readConfig();
    const pool = await ensurePool(oracledb, connection, cfg).catch(() => undefined);
    try {
      const conn = pool
        ? await pool.getConnection()
        : await oracledb.getConnection(parseConnString(connection));
      conn.callTimeout = 0;
      return conn as unknown as DebugConnection;
    } catch {
      return undefined;
    }
  },
  async runTest(conn, packageName, testName) {
    const path = testName ? `${packageName}.${testName}` : packageName;
    await conn.execute(
      `BEGIN
         ut_runner.run(
           a_paths     => ut_varchar2_list(:path),
           a_reporters => ut_reporters()
         );
       END;`,
      { path },
      { autoCommit: true },
    );
  },
};

/**
 * Extrai os nomes de parâmetros de uma procedure/function do fonte PL/SQL.
 * Heurística conservadora usada para alimentar `GET_VALUE` (RF5): não há como
 * enumerar variáveis locais via DBMS_DEBUG.
 */
export function extractParamNames(text: string, procName: string): string[] {
  if (!procName) return [];
  const esc = procName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`\\b(?:PROCEDURE|FUNCTION)\\s+"?${esc}"?\\s*\\(([^)]*)\\)`, 'i');
  const m = re.exec(text);
  if (!m) return [];
  return m[1]
    .split(',')
    .map((p) => p.trim().split(/\s+/)[0].replace(/^"|"$/g, ''))
    .filter((n) => n && !/^(IN|OUT|IN\s+OUT|NOCOPY)$/i.test(n));
}

// ---------------------------------------------------------------------------
// Protocolo (subconjunto do Debug Adapter Protocol)
// ---------------------------------------------------------------------------

interface DapMessage {
  seq?: number;
  type: string;
  command?: string;
  event?: string;
  arguments?: Record<string, unknown>;
  body?: unknown;
  request_seq?: number;
  success?: boolean;
}

export interface LaunchConfig {
  packageName: string;
  testName?: string;
  connection?: string;
  stopOnException?: boolean;
}

// ---------------------------------------------------------------------------
// Debug Adapter
// ---------------------------------------------------------------------------

/**
 * Implementa o subconjunto do DAP necessário para debug de testes utPLSQL via
 * DBMS_DEBUG: initialize, launch, setBreakpoints, configurationDone, continue,
 * next, stepIn, stepOut, stackTrace, scopes, variables e disconnect.
 */
export class UtplsqlDebugAdapter implements vscode.DebugAdapter {
  readonly onDidSendMessage: vscode.Event<DapMessage>;
  private emitter = new vscode.EventEmitter<DapMessage>();

  private seq = 0;
  private config: LaunchConfig | undefined;
  private schema = 'UT3';
  private debuggeeConn: DebugConnection | undefined;
  private debuggerConn: DebugConnection | undefined;
  private debuggeeClient: DbmsDebugClient | undefined;
  private debuggerClient: DbmsDebugClient | undefined;
  private sessionId: string | undefined;
  private breakpoints = new Map<number, BreakpointTarget>();
  private pendingBreakpoints: { id: number; target: BreakpointTarget }[] = [];
  private breakpointsApplied = false;
  private currentFrame: { name: string; line: number } | undefined;
  private sourcePath = '';
  private terminated = false;
  private controlPromise: Promise<void> = Promise.resolve();
  private breakpointPromise: Promise<void> = Promise.resolve();
  private timer: NodeJS.Timeout | undefined;

  constructor(private runtime: DebuggerRuntime = liveRuntime) {
    this.onDidSendMessage = this.emitter.event;
  }

  handleMessage(message: DapMessage): void {
    if (message.type !== 'request') return;
    const cmd = message.command ?? '';
    const args = (message.arguments ?? {}) as Record<string, unknown>;

    switch (cmd) {
      case 'initialize':
        this.sendResponse(message, {
          supportsConfigurationDoneRequest: true,
          supportsSetVariable: false,
          supportsTerminateRequest: true,
        });
        this.sendEvent('initialized', {});
        break;
      case 'launch':
        this.config = {
          packageName: String(args.packageName ?? ''),
          testName: args.testName ? String(args.testName) : undefined,
          connection: args.connection ? String(args.connection) : undefined,
          stopOnException: Boolean(args.stopOnException ?? true),
        };
        if (this.config.connection) {
          this.schema = connectionUser(this.config.connection) ?? this.schema;
        }
        this.sendResponse(message, {});
        void this.initSession();
        break;
      case 'setBreakpoints':
        this.breakpointPromise = this.breakpointPromise.then(async () => {
          const result = await this.applyBreakpoints(args);
          this.sendResponse(message, { breakpoints: result });
        });
        break;
      case 'configurationDone':
        this.sendResponse(message, {});
        this.queueStep('continue');
        break;
      case 'continue':
        this.sendResponse(message, { allThreadsContinued: true });
        this.queueStep('continue');
        break;
      case 'next':
        this.sendResponse(message, {});
        this.queueStep('over');
        break;
      case 'stepIn':
        this.sendResponse(message, {});
        this.queueStep('into');
        break;
      case 'stepOut':
        this.sendResponse(message, {});
        this.queueStep('out');
        break;
      case 'stackTrace': {
        const frame = this.currentFrame;
        const frames = frame
          ? [
              {
                id: 1,
                name: frame.name,
                line: frame.line,
                column: 1,
                source: { name: `${frame.name}.pks`, path: this.sourcePathForFrame() },
              },
            ]
          : [];
        this.sendResponse(message, { stackFrames: frames, totalFrames: frames.length });
        break;
      }
      case 'scopes':
        this.sendResponse(message, {
          scopes: [{ name: 'Locals', variablesReference: 1, expensive: false }],
        });
        break;
      case 'variables':
        this.controlPromise = this.controlPromise.then(async () => {
          const vars = await this.readVariables();
          this.sendResponse(message, { variables: vars });
        });
        break;
      case 'disconnect':
      case 'terminate':
        this.sendResponse(message, {});
        void this.teardown();
        break;
      case 'pause':
        this.sendResponse(message, {
          success: false,
          message: 'Pause não suportado pelo DBMS_DEBUG.',
        });
        break;
      default:
        this.sendResponse(message, {
          success: false,
          message: `Comando não suportado: ${cmd}`,
        });
    }
  }

  dispose(): void {
    void this.teardown();
    this.emitter.dispose();
  }

  // -------------------------------------------------------------------------
  // Ciclo de vida
  // -------------------------------------------------------------------------

  private sourcePathForFrame(): string {
    const frame = this.currentFrame;
    if (!frame) return '';
    return `${frame.name.split('.').pop()}.pks`;
  }

  private async applyBreakpoints(
    args: Record<string, unknown>,
  ): Promise<{ id: number; verified: boolean }[]> {
    const source = (args.source ?? {}) as { path?: string; name?: string };
    const file = source.path ?? source.name ?? '';
    this.sourcePath = file;
    const lines = (args.breakpoints ?? []) as { line?: number }[];
    const result: { id: number; verified: boolean }[] = [];

    // Breakpoints precisam ser definidos DEPOIS de o target chegar ao entry
    // (o DBMS_DEBUG ignora silenciosamente breakpoints "deferred"). Enquanto a
    // sessão não chega lá, guardamos como pendentes.
    if (!this.debuggerClient || !this.breakpointsApplied) {
      for (const b of lines) {
        const target = parseBreakpointTarget(file, this.schema);
        target.line = b.line ?? 1;
        const id = ++this.seq;
        this.pendingBreakpoints.push({ id, target });
        result.push({ id, verified: false });
      }
      return result;
    }

    for (const b of lines) {
      const target = parseBreakpointTarget(file, this.schema);
      target.line = b.line ?? 1;
      let verified = false;
      let id = -1;
      try {
        id = await this.debuggerClient.setBreakpoint(target);
        verified = id >= 0;
      } catch {
        verified = false;
      }
      const dapId = ++this.seq;
      this.breakpoints.set(dapId, target);
      result.push({ id: dapId, verified });
    }
    return result;
  }

  private async initSession(): Promise<void> {
    try {
      this.debuggeeConn = await this.runtime.acquireConnection();
      if (!this.debuggeeConn) {
        throw new Error(t(getExtensionLocale(), 'debug.noConnection'));
      }
      const codes = await loadBindCodes();
      this.debuggeeClient = new DbmsDebugClient(this.debuggeeConn, codes);
      this.sessionId = await this.debuggeeClient.debugOn();

      this.debuggerConn = await this.runtime.acquireConnection();
      if (!this.debuggerConn) {
        throw new Error(t(getExtensionLocale(), 'debug.controlFail'));
      }
      this.debuggerClient = new DbmsDebugClient(this.debuggerConn, codes);
      const attached = await this.debuggerClient.attachSession(this.sessionId, 30);
      if (!attached) {
        throw new Error(t(getExtensionLocale(), 'debug.attachFail'));
      }

      this.startTimeout();
      this.sendEvent('output', {
        category: 'console',
        output: `[utplsql-debug] Sessão ${this.sessionId} anexada.\n`,
      });

      if (this.config) {
        void this.runTestInBackground(this.config);
      }
      // Espera o interpreter iniciar e só então instala os breakpoints
      // (deferred breakpoints são ignorados pelo DBMS_DEBUG).
      await this.debuggerClient.synchronize().catch(() => {});
      await this.flushPendingBreakpoints();
      this.breakpointsApplied = true;
      this.sendEvent('stopped', { reason: 'entry', threadId: 1, allThreadsStopped: true });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      this.sendEvent('output', { category: 'console', output: `${msg}\n` });
      this.sendEvent('terminated', {});
      void this.teardown();
    }
  }

  /** Instala os breakpoints que chegaram antes do entry. */
  private async flushPendingBreakpoints(): Promise<void> {
    if (!this.debuggerClient) return;
    const pending = this.pendingBreakpoints;
    this.pendingBreakpoints = [];
    for (const { id, target } of pending) {
      try {
        const bkId = await this.debuggerClient.setBreakpoint(target);
        const verified = bkId >= 0;
        this.breakpoints.set(id, target);
        this.sendEvent('breakpoint', { reason: 'changed', breakpoint: { id, verified } });
      } catch {
        /* ignora alvo inválido */
      }
    }
  }

  private async runTestInBackground(cfg: LaunchConfig): Promise<void> {
    if (!this.debuggeeConn) return;
    await this.runtime.runTest(this.debuggeeConn, cfg.packageName, cfg.testName);
  }

  private queueStep(action: 'continue' | 'over' | 'into' | 'out'): void {
    this.controlPromise = this.controlPromise
      .then(() => this.waitForNextStop(action))
      .catch(() => {});
  }

  private async waitForNextStop(action: 'continue' | 'over' | 'into' | 'out'): Promise<void> {
    if (!this.debuggerClient || this.terminated) return;
    try {
      let status: string;
      switch (action) {
        case 'over':
          status = await this.debuggerClient.stepOver();
          break;
        case 'into':
          status = await this.debuggerClient.stepInto();
          break;
        case 'out':
          status = await this.debuggerClient.stepOut();
          break;
        default:
          status = await this.debuggerClient.continueRun();
      }
      await this.reportStop(status);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      this.sendEvent('output', { category: 'stderr', output: `${msg}\n` });
      this.sendEvent('terminated', {});
      void this.teardown();
    }
  }

  private async reportStop(status: string): Promise<void> {
    // 'unknown' indica erro/timeout do CONTINUE — encerra em vez de re-continuar
    // (evita loop infinito quando o debugger não responde).
    if (status === 'exiting' || status === 'killed' || status === 'unknown') {
      this.sendEvent('terminated', {});
      void this.teardown();
      return;
    }
    if (status === 'break' && this.debuggerClient) {
      const frame = await this.debuggerClient.getRuntimeFrame(1);
      this.currentFrame = { name: frame.name, line: frame.line };
      this.sendEvent('stopped', {
        reason: 'breakpoint',
        threadId: 1,
        allThreadsStopped: true,
      });
      return;
    }
    // no_break: sem parada — continua até terminar
    await this.waitForNextStop('continue');
  }

  private async readVariables(): Promise<{ name: string; value: string; type: string }[]> {
    if (!this.debuggerClient) return [];
    let names: string[] = [];
    try {
      if (this.sourcePath && this.currentFrame) {
        const proc = this.currentFrame.name.split('.').pop() ?? '';
        const text = fs.readFileSync(this.sourcePath, 'utf-8');
        names = extractParamNames(text, proc);
      }
    } catch {
      /* fonte indisponível: segue sem nomes */
    }
    try {
      return await this.debuggerClient.getVariables(names);
    } catch {
      return [];
    }
  }

  private async teardown(): Promise<void> {
    if (this.timer) clearTimeout(this.timer);
    this.terminated = true;
    if (this.debuggerClient) {
      try {
        await this.debuggerClient.detachSession();
      } catch {
        /* ignore */
      }
    }
    if (this.debuggeeClient) {
      try {
        await this.debuggeeClient.debugOff();
      } catch {
        /* ignore */
      }
    }
    for (const conn of [this.debuggeeConn, this.debuggerConn]) {
      if (conn) {
        try {
          await conn.close();
        } catch {
          /* ignore */
        }
      }
    }
    this.debuggeeConn = undefined;
    this.debuggerConn = undefined;
    this.debuggeeClient = undefined;
    this.debuggerClient = undefined;
    this.sessionId = undefined;
  }

  private startTimeout(): void {
    const seconds = readConfig().debuggerTimeoutSeconds;
    this.timer = setTimeout(() => {
      this.sendEvent('output', {
        category: 'console',
        output: '[utplsql-debug] Timeout da sessão de debug — encerrando.\n',
      });
      this.sendEvent('terminated', {});
      void this.teardown();
    }, seconds * 1000);
    this.timer.unref?.();
  }

  // -------------------------------------------------------------------------
  // Helpers de protocolo
  // -------------------------------------------------------------------------

  private sendResponse(request: DapMessage, body: Record<string, unknown>): void {
    this.emitter.fire({
      seq: ++this.seq,
      type: 'response',
      request_seq: request.seq ?? 0,
      success: true,
      command: request.command,
      body,
    });
  }

  private sendEvent(event: string, body: Record<string, unknown>): void {
    this.emitter.fire({ seq: ++this.seq, type: 'event', event, body });
  }
}

// ---------------------------------------------------------------------------
// Registro no VSCode
// ---------------------------------------------------------------------------

export class UtplsqlDebugAdapterDescriptorFactory implements vscode.DebugAdapterDescriptorFactory {
  createDebugAdapterDescriptor(
    _session: vscode.DebugSession,
  ): vscode.ProviderResult<vscode.DebugAdapterDescriptor> {
    return new vscode.DebugAdapterInlineImplementation(new UtplsqlDebugAdapter());
  }
}

export class UtplsqlDebugConfigurationProvider implements vscode.DebugConfigurationProvider {
  resolveDebugConfiguration(
    _folder: vscode.WorkspaceFolder | undefined,
    config: vscode.DebugConfiguration,
  ): vscode.ProviderResult<vscode.DebugConfiguration> {
    const profile = resolveConnectionNoPrompt();
    config.type = 'utplsql';
    config.request = 'launch';
    if (!config.connection && profile) config.connection = profile;
    config.stopOnException = config.stopOnException ?? readConfig().debuggerStopOnException;
    return config;
  }
}

/** Monta uma launch config para um teste/suite e inicia a sessão de debug. */
export async function startDebugSession(packageName: string, testName?: string): Promise<void> {
  const connection = resolveConnectionNoPrompt();
  const config: vscode.DebugConfiguration = {
    type: 'utplsql',
    request: 'launch',
    name: `Debug ${packageName}${testName ? ` > ${testName}` : ''}`,
    packageName,
    testName,
    ...(connection ? { connection } : {}),
    stopOnException: readConfig().debuggerStopOnException,
  };
  await vscode.debug.startDebugging(undefined, config);
}
