/**
 * Log de diagnóstico gateado por `UTPLSQL_DEBUG=1` (PRD-66 RF1) e encaminhado
 * para um *sink* opcional — o `LogOutputChannel` `utPLSQL` (ver `extension.ts`).
 * Módulo puro (sem `vscode`); nunca lança e nunca deve receber credenciais.
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';
export type LogSink = (level: LogLevel, msg: string, ctx?: Record<string, unknown>) => void;

let sink: LogSink | undefined;

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
