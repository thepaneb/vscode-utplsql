/**
 * Log de diagnóstico gateado por `UTPLSQL_DEBUG=1` (PRD-66 RF1).
 * Módulo puro (sem `vscode`); nunca lança e nunca loga credenciais.
 */
export const logger = {
  debug(msg: string, ctx?: Record<string, unknown>): void {
    if (process.env.UTPLSQL_DEBUG !== '1') return;
    // biome-ignore lint/suspicious/noConsole: log de diagnóstico opt-in
    console.debug('[utplsql]', msg, ctx ?? '');
  },
};
