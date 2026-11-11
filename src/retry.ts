/**
 * Retry com backoff exponencial para operações read-only de descoberta
 * (PRD-131 RF1/RF2). Módulo PURO (sem `vscode`).
 */

export interface RetryOptions {
  /** Tentativas **extras** depois da primeira (0 desliga). */
  attempts?: number;
  /** Espera inicial; dobra a cada tentativa até `maxDelayMs`. */
  baseDelayMs?: number;
  maxDelayMs?: number;
  /** Decide se o erro é transitório; sem a função, não repete. */
  isRetryable?: (error: unknown) => boolean;
  /** Injetável nos testes para não esperar de verdade. */
  sleep?: (ms: number) => Promise<void>;
  onRetry?: (error: unknown, attempt: number) => void;
}

const RETRYABLE_ORA = new Set([
  3113, 3135, 12170, 12514, 12537, 12541, 12545, 12547, 12560, 12570, 12571,
]);
const RETRYABLE_FS = new Set(['EBUSY', 'ETIMEDOUT', 'EAGAIN', 'EMFILE', 'ENFILE', 'ECONNRESET']);

function codeOf(error: unknown): string | undefined {
  if (!error || typeof error !== 'object') return undefined;
  const candidate = error as { code?: unknown };
  return typeof candidate.code === 'string' ? candidate.code : undefined;
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function oracleNumber(error: unknown): number | undefined {
  if (!error || typeof error !== 'object') return undefined;
  const candidate = error as { errorNum?: unknown };
  if (typeof candidate.errorNum === 'number') return candidate.errorNum;
  const match = /\bORA-(\d{5})\b/.exec(messageOf(error));
  return match ? Number(match[1]) : undefined;
}

/**
 * `true` apenas para falhas transitórias de rede/conexão/FS. Autenticação,
 * permissão e objeto inexistente não são repetidos.
 */
export function isRetryable(error: unknown): boolean {
  const code = codeOf(error);
  if (code && RETRYABLE_FS.has(code.toUpperCase())) return true;
  const num = oracleNumber(error);
  if (num !== undefined) return RETRYABLE_ORA.has(num);
  return /NJS-040|DPI-1067|\bECONNRESET\b|\bETIMEDOUT\b|\btimed out\b/i.test(messageOf(error));
}

const defaultSleep = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

/** Executa `fn`, repetindo apenas quando `isRetryable` aceitar o erro. */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const attempts = Math.max(0, Math.trunc(options.attempts ?? 2));
  const base = Math.max(1, options.baseDelayMs ?? 200);
  const max = Math.max(base, options.maxDelayMs ?? 800);
  const sleep = options.sleep ?? defaultSleep;
  let last: unknown;

  for (let attempt = 0; attempt <= attempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      last = error;
      const retryable = options.isRetryable?.(error) ?? false;
      if (attempt >= attempts || !retryable) throw error;
      options.onRetry?.(error, attempt + 1);
      await sleep(Math.min(base * 2 ** attempt, max));
    }
  }
  throw last;
}
