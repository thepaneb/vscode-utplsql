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
import { logger } from './logger';
import { connectionUser, parseConnString } from './oracleRunner';

// ---------------------------------------------------------------------------
// Contratos injetáveis (testáveis com fake)
// ---------------------------------------------------------------------------

/** Timeout aguardando o debuggee entrar no interpretador (SYNCHRONIZE). */
const SYNCHRONIZE_TIMEOUT_MS = 30_000;

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
    try {
      // Conexão dedicada (fora do pool): a sessão de debug fica bloqueada no
      // ut_runner.run enquanto o usuário depura — no pool compartilhado isso
      // esgota as conexões do runner/coverage (NJS-040 queueTimeout).
      const conn = await oracledb.getConnection(parseConnString(connection));
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
  /** Mapa unit (maiúsculo) → caminho do fonte local, para alinhar linhas. */
  private unitSource = new Map<string, string>();
  /** Cache de offset (linhas antes da declaração da unidade) por unit. */
  private offsetCache = new Map<string, number>();
  private sourcePath = '';
  private terminated = false;
  private controlPromise: Promise<void> = Promise.resolve();
  private breakpointPromise: Promise<void> = Promise.resolve();
  private timer: NodeJS.Timeout | undefined;
  /** Erro do `ut_runner.run` no debuggee (o teste nunca entrou em debug). */
  private runFailure: string | undefined;
  private resolveRunFailure!: () => void;
  private runFailurePromise = new Promise<void>((resolve) => {
    this.resolveRunFailure = resolve;
  });
  /** Handshake: o stop de entry só vale depois do configurationDone. */
  private configurationDone = false;
  private entryReady = false;
  private entryStopSent = false;

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
        // `initialized` após o launch (DAP): habilita setBreakpoints/configDone.
        this.sendEvent('initialized', {});
        void this.initSession();
        break;
      case 'setBreakpoints':
        this.breakpointPromise = this.breakpointPromise.then(async () => {
          const result = await this.applyBreakpoints(args);
          this.sendResponse(message, { breakpoints: result });
        });
        break;
      case 'configurationDone':
        // Não continua: a sessão fica parada no entry (`stopped`) aguardando o
        // usuário dar Continue/Step — quem comanda é o pedido `continue`.
        this.sendResponse(message, {});
        this.configurationDone = true;
        this.trySendEntryStop();
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
      case 'threads':
        // Necessário para o VSCode registrar a thread e habilitar Continue/Step.
        this.sendResponse(message, { threads: [{ id: 1, name: 'utPLSQL' }] });
        break;
      case 'setExceptionBreakpoints':
        this.sendResponse(message, { breakpoints: [] });
        break;
      case 'stackTrace': {
        const frame = this.currentFrame;
        const src = this.sourceForFrame();
        const frames = frame
          ? [
              {
                id: 1,
                name: frame.name,
                line: frame.line,
                column: 1,
                source: { name: src.name, path: src.path },
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
          message: t(getExtensionLocale(), 'debug.pauseUnsupported'),
        });
        break;
      default:
        this.sendResponse(message, {
          success: false,
          message: t(getExtensionLocale(), 'debug.commandUnsupported', { cmd }),
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

  /**
   * Fonte local do frame atual: usa o arquivo onde o breakpoint foi definido
   * (`unitSource`) em vez de inventar `<unit>.pks` — o objeto pode estar num
   * `.sql`/`.fnc`/`.prc`.
   */
  private sourceForFrame(): { name: string; path: string } {
    const frame = this.currentFrame;
    if (!frame) return { name: '', path: '' };
    const unit = frame.name.split('.').pop() ?? frame.name;
    const mapped = this.unitSource.get(unit.toUpperCase()) ?? this.sourcePath;
    if (mapped) {
      return { name: mapped.split(/[\\/]/).pop() ?? mapped, path: mapped };
    }
    return { name: `${unit}.pks`, path: `${unit}.pks` };
  }

  /**
   * Offset entre a linha do arquivo local e a linha do objeto armazenado.
   * O Oracle descarta o `CREATE OR REPLACE` e comentários antes da declaração
   * da unidade, então um arquivo com header comentado fica deslocado. Descobre
   * o offset localizando, no arquivo local, o texto da 1ª linha de `ALL_SOURCE`.
   */
  private async unitLineOffset(unit: string, sourcePath: string | undefined): Promise<number> {
    const key = unit.toUpperCase();
    const cached = this.offsetCache.get(key);
    if (cached !== undefined) return cached;
    let offset = 0;
    // A conexão debuggee está bloqueada no `ut_runner.run`; consulta na debugger.
    const conn = this.debuggerConn ?? this.debuggeeConn;
    try {
      if (sourcePath && conn) {
        const lines = fs.readFileSync(sourcePath, 'utf-8').split(/\r?\n/);
        const result = await conn.execute(
          `SELECT text FROM (
             SELECT text FROM all_source
              WHERE owner = :owner AND name = :unit AND line = 1
              ORDER BY DECODE(type, 'PACKAGE BODY', 1, 'PACKAGE', 2, 'PROCEDURE', 3,
                              'FUNCTION', 4, 'TRIGGER', 5, 9)
           ) WHERE ROWNUM = 1`,
          { owner: this.schema.toUpperCase(), unit: key },
        );
        const row = (result.rows ?? [])[0];
        const raw = Array.isArray(row) ? row[0] : (row as { TEXT?: unknown })?.TEXT;
        const first = String(raw ?? '')
          .trim()
          .toUpperCase();
        if (first) {
          const idx = lines.findIndex((l) => l.toUpperCase().includes(first));
          if (idx > 0) offset = idx;
        }
      }
    } catch (e) {
      logger.debug('unitLineOffset falhou', { unit: key, error: String(e) });
      offset = 0;
    }
    this.offsetCache.set(key, offset);
    return offset;
  }

  /** Define o breakpoint já alinhado à numeração do objeto armazenado. */
  private async setAlignedBreakpoint(target: BreakpointTarget): Promise<number> {
    if (!this.debuggerClient) return -1;
    const sourcePath = target.sourcePath ?? (this.sourcePath || undefined);
    if (sourcePath) this.unitSource.set(target.unit.toUpperCase(), sourcePath);
    const offset = await this.unitLineOffset(target.unit, sourcePath);
    const line = target.line - offset;
    return this.debuggerClient.setBreakpoint({ ...target, line: line > 0 ? line : target.line });
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
        id = await this.setAlignedBreakpoint(target);
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
    if (readConfig().debuggerCompileOnDebug && this.config?.packageName) {
      try {
        // RF4 (PRD-73): compila com debug info antes de iniciar a sessão.
        const { compileForDebug } = await import('./compileForDebug.js');
        await compileForDebug([{ name: this.config.packageName, kinds: ['package'] }]);
      } catch {
        /* best-effort: falha na compilação não impede o debug */
      }
    }
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
        output: `[utplsql-debug] ${t(getExtensionLocale(), 'debug.sessionAttached', { id: this.sessionId ?? '' })}\n`,
      });

      if (this.config) {
        void this.runTestInBackground(this.config);
      }
      // Espera o interpreter iniciar e só então instala os breakpoints
      // (deferred breakpoints são ignorados pelo DBMS_DEBUG). O `synchronize`
      // trava indefinidamente se o debuggee nunca entrar em modo debug — por
      // isso corremos contra a falha do teste e um timeout.
      const outcome = await Promise.race([
        this.debuggerClient.synchronize().then(() => 'sync' as const),
        this.runFailurePromise.then(() => 'runfail' as const),
        new Promise<'timeout'>((resolve) => {
          setTimeout(() => resolve('timeout'), SYNCHRONIZE_TIMEOUT_MS).unref?.();
        }),
      ]);
      if (this.runFailure !== undefined) {
        throw new Error(t(getExtensionLocale(), 'debug.runTestFailed', { error: this.runFailure }));
      }
      if (outcome === 'timeout') {
        throw new Error(t(getExtensionLocale(), 'debug.syncTimeout'));
      }
      const applied = await this.flushPendingBreakpoints();
      this.breakpointsApplied = true;
      this.sendEvent('output', {
        category: 'console',
        output: `[utplsql-debug] ${t(getExtensionLocale(), 'debug.breakpointsApplied', { count: applied })}\n`,
      });
      this.entryReady = true;
      this.trySendEntryStop();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      this.sendEvent('output', { category: 'console', output: `${msg}\n` });
      this.sendEvent('terminated', {});
      void this.teardown();
    }
  }

  /** Instala os breakpoints que chegaram antes do entry; devolve quantos valeram. */
  private async flushPendingBreakpoints(): Promise<number> {
    if (!this.debuggerClient) return 0;
    const pending = this.pendingBreakpoints;
    this.pendingBreakpoints = [];
    let applied = 0;
    for (const { id, target } of pending) {
      try {
        const bkId = await this.setAlignedBreakpoint(target);
        const verified = bkId >= 0;
        if (verified) applied++;
        this.breakpoints.set(id, target);
        this.sendEvent('breakpoint', { reason: 'changed', breakpoint: { id, verified } });
      } catch {
        /* ignora alvo inválido */
      }
    }
    return applied;
  }

  private async runTestInBackground(cfg: LaunchConfig): Promise<void> {
    if (!this.debuggeeConn) return;
    try {
      await this.runtime.runTest(this.debuggeeConn, cfg.packageName, cfg.testName);
    } catch (e) {
      this.runFailure = e instanceof Error ? e.message : String(e);
      this.resolveRunFailure();
    }
  }

  /** Envia o stop de entry só quando a sessão está pronta E o VSCode configurou. */
  private trySendEntryStop(): void {
    if (this.entryStopSent || !this.entryReady || !this.configurationDone) return;
    this.entryStopSent = true;
    this.sendEvent('output', {
      category: 'console',
      output: `[utplsql-debug] ${t(getExtensionLocale(), 'debug.stoppedAtEntry')}\n`,
    });
    this.sendEvent('stopped', { reason: 'entry', threadId: 1, allThreadsStopped: true });
  }

  private queueStep(action: 'continue' | 'over' | 'into' | 'out'): void {
    this.controlPromise = this.controlPromise
      .then(() => this.waitForNextStop(action))
      .catch(() => {});
  }

  private async waitForNextStop(action: 'continue' | 'over' | 'into' | 'out'): Promise<void> {
    if (!this.debuggerClient || this.terminated) return;
    try {
      // `stopOnException` só tem efeito se o CONTINUE pedir `break_exception`.
      const breakOnException = this.config?.stopOnException !== false;
      let status: string;
      switch (action) {
        case 'over':
          status = await this.debuggerClient.stepOver(breakOnException);
          break;
        case 'into':
          status = await this.debuggerClient.stepInto(breakOnException);
          break;
        case 'out':
          status = await this.debuggerClient.stepOut(breakOnException);
          break;
        default:
          status = await this.debuggerClient.continueRun(breakOnException);
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
    const isException = status === 'exception';
    // `stopOnException=false` segue em frente quando o evento é uma exceção
    // (reason_exception/reason_handler), como se fosse um no_break.
    if (isException && this.config?.stopOnException === false) {
      await this.waitForNextStop('continue');
      return;
    }
    if ((status === 'break' || isException) && this.debuggerClient) {
      const frame = await this.debuggerClient.getRuntimeFrame(1);
      // Converte a linha do objeto armazenado de volta para a do arquivo local.
      const unit = frame.name.split('.').pop() ?? frame.name;
      const offset = await this.unitLineOffset(unit, this.unitSource.get(unit.toUpperCase()));
      const line = frame.line > 0 ? frame.line + offset : frame.line;
      this.currentFrame = { name: frame.name, line };
      this.sendEvent('stopped', {
        reason: isException ? 'exception' : 'breakpoint',
        threadId: 1,
        allThreadsStopped: true,
      });
      return;
    }
    // no_break: sem parada — continua até terminar
    await this.waitForNextStop('continue');
  }

  private async readVariables(): Promise<
    { name: string; value: string; type: string; variablesReference: number }[]
  > {
    if (!this.debuggerClient) return [];
    let names: string[] = [];
    try {
      const src = this.sourceForFrame();
      if (src.path && this.currentFrame) {
        const proc = this.currentFrame.name.split('.').pop() ?? '';
        const text = fs.readFileSync(src.path, 'utf-8');
        names = extractParamNames(text, proc);
      }
    } catch {
      /* fonte indisponível: segue sem nomes */
    }
    try {
      const vars = await this.debuggerClient.getVariables(names);
      // DAP exige `variablesReference` (0 = folha), senão o VSCode mostra
      // "Invalid variable attributes".
      return vars.map((v) => ({ ...v, variablesReference: 0 }));
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
      if (!conn) continue;
      try {
        // Cancela o `ut_runner.run` pendente no debuggee, senão o close trava.
        await conn.break?.();
      } catch {
        /* ignore */
      }
      try {
        await Promise.race([
          conn.close(),
          new Promise<void>((resolve) => {
            setTimeout(resolve, 5000).unref?.();
          }),
        ]);
      } catch {
        /* ignore */
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
        output: `[utplsql-debug] ${t(getExtensionLocale(), 'debug.sessionTimeout')}\n`,
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
