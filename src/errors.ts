/**
 * Hierarquia de erros de domínio da extensão (PRD-130).
 *
 * Módulo PURO (sem `vscode`): as mensagens de usuário são resolvidas pelo
 * catálogo i18n via `userMessageKey`, mantendo a causa original em `cause`.
 */

import { type ExtensionLocale, t } from './i18n';
import { redactConnection } from './redact';

export interface UtplsqlErrorOptions {
  /** Código estável para logs/testes (ex.: `UTPLSQL_CONNECTION`). */
  code?: string;
  /** Chave do catálogo i18n usada na mensagem ao usuário. */
  userMessageKey?: string;
  /** Parâmetros da mensagem (`{name}`, `{version}`, ...). */
  params?: Record<string, string | number>;
  /** Causa original preservada para diagnóstico. */
  cause?: unknown;
  /** Anexa a mensagem original quando a chave não tem `{error}`. */
  includeDetail?: boolean;
}

/** Base de todos os erros de domínio da extensão. */
export class UtplsqlError extends Error {
  readonly code: string;
  readonly userMessageKey: string;
  readonly params: Record<string, string | number>;
  readonly includeDetail: boolean;

  constructor(message: string, options: UtplsqlErrorOptions = {}) {
    super(message, options.cause === undefined ? undefined : { cause: options.cause });
    this.name = new.target.name;
    this.code = options.code ?? 'UTPLSQL_ERROR';
    this.userMessageKey = options.userMessageKey ?? 'common.error';
    this.params = options.params ?? {};
    this.includeDetail = options.includeDetail ?? true;
  }
}

/** Falha de conexão/autenticação com o banco Oracle. */
export class OracleConnectionError extends UtplsqlError {
  constructor(
    message: string,
    options: Omit<UtplsqlErrorOptions, 'code'> & {
      code?: 'UTPLSQL_CONNECTION' | 'UTPLSQL_AUTH';
    } = {},
  ) {
    super(message, {
      userMessageKey: 'runner.oracleError',
      ...options,
      code: options.code ?? 'UTPLSQL_CONNECTION',
    });
  }
}

/** Versão do utPLSQL instalada abaixo do mínimo suportado. */
export class UtplsqlVersionError extends UtplsqlError {
  constructor(message: string, version: string, cause?: unknown) {
    super(message, {
      cause,
      code: 'UTPLSQL_VERSION',
      userMessageKey: 'quickfix.oldVersion',
      params: { version },
      includeDetail: false,
    });
  }
}

/** Reporter solicitado (export/cobertura) não existe no banco. */
export class ReporterNotFoundError extends UtplsqlError {
  constructor(name: string, cause?: unknown) {
    super(`Reporter not found: ${name}`, {
      cause,
      code: 'UTPLSQL_REPORTER',
      userMessageKey: 'runner.reporterUnknown',
      params: { name },
      includeDetail: false,
    });
  }
}

/** Configuração inválida que não pôde ser corrigida por fallback. */
export class ConfigurationError extends UtplsqlError {
  constructor(message: string, cause?: unknown) {
    super(message, {
      cause,
      code: 'UTPLSQL_CONFIG',
      userMessageKey: 'common.error',
    });
  }
}

/** Timeout de conexão/pool (não confundir com `RunAbortedError`). */
export class TimeoutError extends UtplsqlError {
  constructor(message: string, cause?: unknown) {
    super(message, {
      cause,
      code: 'UTPLSQL_TIMEOUT',
      userMessageKey: 'runner.timedOut',
      includeDetail: false,
    });
  }
}

export function isUtplsqlError(error: unknown): error is UtplsqlError {
  return error instanceof UtplsqlError;
}

function oracleErrorNumber(error: unknown): number | undefined {
  if (!error || typeof error !== 'object') return undefined;
  const candidate = error as { errorNum?: unknown; message?: unknown };
  if (typeof candidate.errorNum === 'number') return candidate.errorNum;
  const message = typeof candidate.message === 'string' ? candidate.message : '';
  const match = /\bORA-(\d{5})\b/.exec(message);
  return match ? Number(match[1]) : undefined;
}

const AUTH_ERRORS = new Set([1017, 28000, 28001]);
const CONNECTION_ERRORS = new Set([
  3113, 3135, 12170, 12514, 12537, 12541, 12545, 12547, 12560, 12570, 12571,
]);

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Mapeia erros do `node-oracledb` para as classes tipadas, preservando a causa.
 * Erros desconhecidos são devolvidos intactos para não mascarar o diagnóstico.
 */
export function mapOracleError(error: unknown): unknown {
  if (error instanceof UtplsqlError) return error;
  const message = errorMessage(error);
  const num = oracleErrorNumber(error);
  if (num !== undefined && AUTH_ERRORS.has(num)) {
    return new OracleConnectionError(message, { cause: error, code: 'UTPLSQL_AUTH' });
  }
  if (num !== undefined && CONNECTION_ERRORS.has(num)) {
    return new OracleConnectionError(message, { cause: error });
  }
  if (/NJS-040|DPI-1067|\btimeout\b|\btimed out\b/i.test(message)) {
    return new TimeoutError(message, error);
  }
  return error;
}

/**
 * Mensagem localizada para um erro. Mantém a redaction da conexão conhecida e
 * cai na mensagem crua quando o erro não é de domínio.
 */
export function formatUserError(error: unknown, locale: ExtensionLocale, connection = ''): string {
  const detail = redactConnection(errorMessage(error), connection);
  if (!(error instanceof UtplsqlError)) return detail;

  const message = t(locale, error.userMessageKey, { ...error.params, error: detail });
  if (message === error.userMessageKey) return detail;
  if (error.includeDetail && !message.includes(detail)) return `${message}: ${detail}`;
  return message;
}
