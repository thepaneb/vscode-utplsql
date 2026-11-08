/**
 * Log de diagnóstico gateado por `UTPLSQL_DEBUG=1` (PRD-66 RF1) e encaminhado
 * para um *sink* opcional — o `LogOutputChannel` `utPLSQL` (ver `extension.ts`).
 * Módulo puro (sem `vscode`); nunca lança e nunca deve receber credenciais.
 */
export type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error';
export type LogSink = (level: LogLevel, msg: string, ctx?: Record<string, unknown>) => void;

let sink: LogSink | undefined;
let traceEnabled = false;

/** Liga/desliga o trace verboso por evento (`utplsql.trace`, PRD-102). */
export function setTraceEnabled(enabled: boolean): void {
  traceEnabled = enabled === true;
}

export function isTraceEnabled(): boolean {
  return traceEnabled;
}

/** Define o destino do log estruturado (LogOutputChannel). `undefined` limpa. */
export function setLogSink(next: LogSink | undefined): void {
  sink = next;
}

/** Formata a linha do log: mensagem + contexto JSON (quando houver). */
export function formatLogLine(msg: string, ctx?: Record<string, unknown>): string {
  if (!ctx || Object.keys(ctx).length === 0) return msg;
  try {
    return `${msg} ${JSON.stringify(ctx)}`;
  } catch {
    return msg;
  }
}

function emit(level: LogLevel, msg: string, ctx?: Record<string, unknown>): void {
  try {
    sink?.(level, msg, ctx);
  } catch {
    /* nunca lança */
  }
}

export const logger = {
  trace(msg: string, ctx?: Record<string, unknown>): void {
    if (!traceEnabled) return;
    if (process.env.UTPLSQL_DEBUG === '1') console.debug('[utplsql][trace]', msg, ctx ?? '');
    emit('trace', msg, ctx);
  },
  debug(msg: string, ctx?: Record<string, unknown>): void {
    if (process.env.UTPLSQL_DEBUG === '1') console.debug('[utplsql]', msg, ctx ?? '');
    emit('debug', msg, ctx);
  },
  info(msg: string, ctx?: Record<string, unknown>): void {
    emit('info', msg, ctx);
  },
  warn(msg: string, ctx?: Record<string, unknown>): void {
    console.warn('[utplsql]', msg, ctx ?? '');
    emit('warn', msg, ctx);
  },
  error(msg: string, ctx?: Record<string, unknown>): void {
    console.error('[utplsql]', msg, ctx ?? '');
    emit('error', msg, ctx);
  },
};
