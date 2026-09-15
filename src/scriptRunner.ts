// Motor de execução de scripts SQL/PL/SQL contra um perfil de conexão (PRD-62).
//
// `splitScript` e `decodeScript` são puros (sem 'vscode') — cobertos por testes
// unitários. `executeScript` recebe a conexão via injeção (`ScriptConnect`) para
// ser testável sem banco; `connectOracle` é o adaptador de produção
// (node-oracledb via `oracleRunner.ts`).

import type * as vscode from 'vscode';
import { getExtensionLocale } from './config';
import { maskConnection } from './connectionProfiles';
import { t } from './i18n';
import { ensurePool, parseConnString } from './oracleRunner';
import type { ProfileCharset } from './types';

export type { ProfileCharset };

export interface SqlStatement {
  text: string;
  index: number;
  line: number;
}

const VALID_CHARSETS: ReadonlySet<string> = new Set(['utf8', 'latin1', 'win1252']);

/**
 * Converte bytes em string JS no encoding do perfil. Sem `iconv-lite`:
 * `utf8`/`win1252` via `TextDecoder` nativo; `latin1` via
 * `Buffer.toString('latin1')` (ISO-8859-1 real — `TextDecoder('iso-8859-1')`
 * decodificaria como windows-1252 pelo WHATWG). Ausente/inválido → `utf8`
 * (fail-safe). Remove BOM.
 */
export function decodeScript(bytes: Uint8Array, charset?: ProfileCharset): string {
  const normalized = charset && VALID_CHARSETS.has(charset) ? charset : 'utf8';
  if (normalized === 'latin1') {
    const text = Buffer.from(bytes).toString('latin1');
    return text.startsWith('﻿') ? text.slice(1) : text;
  }
  const label = normalized === 'utf8' ? 'utf-8' : 'windows-1252';
  const text = new TextDecoder(label, { fatal: false }).decode(bytes);
  return text.startsWith('﻿') ? text.slice(1) : text;
}

/** Blocos PL/SQL terminam em `/` em linha própria; o resto termina em `;`. */
const PLSQL_START_RE =
  /^(?:DECLARE|BEGIN)\b|^CREATE\s+(?:OR\s+REPLACE\s+)?(?:\w+\s+)*(?:FUNCTION|PROCEDURE|PACKAGE|TRIGGER|TYPE)\b/i;
const SLASH_LINE_RE = /^\s*\/\s*$/;

function stripComments(text: string): string {
  return text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/--[^\n]*/g, '');
}

/** Como o statement começa (ignorando brancos e comentários) — para classificar PL/SQL. */
function statementHead(from: string): string {
  let s = from.replace(/^\s+/, '');
  for (;;) {
    if (s.startsWith('--')) {
      const nl = s.indexOf('\n');
      if (nl < 0) return '';
      s = s.slice(nl + 1).replace(/^\s+/, '');
    } else if (s.startsWith('/*')) {
      const end = s.indexOf('*/');
      if (end < 0) return '';
      s = s.slice(end + 2).replace(/^\s+/, '');
    } else {
      return s;
    }
  }
}

/**
 * Divide um script em statements. Comentários (`--`, `/* *​/`) e literais
 * (`'...'`, `"..."`) são preservados e nunca quebram o split. Statements
 * vazios ou só-comentário são descartados.
 */
export function splitScript(text: string): SqlStatement[] {
  const statements: SqlStatement[] = [];
  let buf = '';
  let lineBuf = '';
  let line = 1;
  let startLine = 1;
  let isPlSql: boolean | undefined;
  let inStr = false;
  let inIdent = false;
  let inBlock = false;
  let inLine = false;

  const hasContent = (): boolean => buf.length > 0 && !/^\s*$/.test(buf);
  let seenCode = false;

  /** Marca a linha do primeiro código do statement (comentários não contam). */
  function markCode(): void {
    if (!seenCode) {
      seenCode = true;
      startLine = line;
    }
  }

  /**
   * Classifica o statement a partir do cabeçalho acumulado. Chamado de forma
   * preguiçosa no primeiro `;` ou na primeira linha `/` — nunca no primeiro
   * caractere, quando o cabeçalho ainda está incompleto.
   */
  function classify(): void {
    if (isPlSql === undefined && hasContent()) {
      isPlSql = PLSQL_START_RE.test(statementHead(buf));
    }
  }

  function emit(): void {
    const text = buf.trim();
    // Ignora vazio, só-comentário e restos de separador (`;` ou `/` soltos).
    if (text && !/^[;\s/]+$/.test(text) && stripComments(text).trim()) {
      statements.push({ text, index: statements.length, line: startLine });
    }
    buf = '';
    isPlSql = undefined;
    seenCode = false;
  }

  /** Remove a linha `/` pendente do buffer (terminador PL/SQL ou separador). */
  function dropSlashLine(): void {
    buf = buf.slice(0, buf.length - lineBuf.length).replace(/[ \t]*$/, '');
    if (!hasContent()) {
      buf = '';
      isPlSql = undefined;
      seenCode = false;
    }
  }

  let i = 0;
  while (i < text.length) {
    const c = text[i];
    const next = i + 1 < text.length ? text[i + 1] : '';

    if (inLine) {
      buf += c;
      lineBuf += c;
      if (c === '\n') {
        inLine = false;
        line++;
        lineBuf = '';
      }
      i++;
      continue;
    }
    if (inBlock) {
      buf += c;
      lineBuf += c;
      if (c === '*' && next === '/') {
        buf += next;
        lineBuf += next;
        i += 2;
        inBlock = false;
        continue;
      }
      if (c === '\n') {
        line++;
        lineBuf = '';
      }
      i++;
      continue;
    }
    if (inStr || inIdent) {
      buf += c;
      if (c === '\n') {
        line++;
        lineBuf = '';
      } else {
        lineBuf += c;
      }
      if (inStr) {
        if (c === "'") {
          if (next === "'") {
            buf += next;
            lineBuf += next;
            i += 2;
            continue;
          }
          inStr = false;
        }
      } else if (c === '"') {
        inIdent = false;
      }
      i++;
      continue;
    }

    if (c === '-' && next === '-') {
      inLine = true;
      buf += '--';
      lineBuf += '--';
      i += 2;
      continue;
    }
    if (c === '/' && next === '*') {
      inBlock = true;
      buf += '/*';
      lineBuf += '/*';
      i += 2;
      continue;
    }
    if (c === "'") {
      markCode();
      inStr = true;
      buf += c;
      lineBuf += c;
      i++;
      continue;
    }
    if (c === '"') {
      markCode();
      inIdent = true;
      buf += c;
      lineBuf += c;
      i++;
      continue;
    }
    if (c === '\n') {
      if (SLASH_LINE_RE.test(lineBuf) && hasContent()) classify();
      if (isPlSql && SLASH_LINE_RE.test(lineBuf)) {
        dropSlashLine();
        // `emit()` ignora buffer vazio — sem ramo `else` necessário.
        emit();
      } else if (!isPlSql && hasContent() && SLASH_LINE_RE.test(lineBuf)) {
        // `/` fora de bloco PL/SQL age como separador (estilo SQL*Plus).
        dropSlashLine();
        emit();
      } else {
        buf += c;
      }
      line++;
      lineBuf = '';
      i++;
      continue;
    }
    if (c === ';' && !isPlSql) {
      classify();
      if (isPlSql) {
        buf += c;
      } else {
        buf += c;
        emit();
      }
      i++;
      continue;
    }
    if (!/\s/.test(c)) markCode();
    buf += c;
    lineBuf += c;
    i++;
  }

  if (hasContent()) {
    // `/` final (com ou sem newline) ainda é terminador/separador.
    const lines = buf.split('\n');
    while (lines.length > 1 && /^\s*(\/)?\s*$/.test(lines[lines.length - 1])) lines.pop();
    const body = lines.join('\n').trim();
    if (body && !/^[;\s/]+$/.test(body) && stripComments(body).trim()) {
      statements.push({ text: body, index: statements.length, line: startLine });
    }
  }
  return statements;
}

/** Primeira linha do statement, truncada — usada no resumo da saída. */
export function summarizeStatement(text: string, max = 80): string {
  const first = text.split('\n')[0].trim();
  return first.length > max ? `${first.slice(0, max - 1)}…` : first;
}

/** Extensões suportadas pelos comandos de script (PRD-62). */
export const SUPPORTED_SCRIPT_EXTS = ['.sql', '.pks', '.pkb', '.fnc', '.prc', '.trg'] as const;

function extractExtensions(filePattern: string): string[] {
  const m = /\{([^}]+)\}/.exec(filePattern);
  if (!m) {
    const single = /\.([A-Za-z0-9]+)\s*$/.exec(filePattern);
    return single ? [`.${single[1].toLowerCase()}`] : [...SUPPORTED_SCRIPT_EXTS];
  }
  const exts = m[1]
    .split(',')
    .map((s) => s.trim().replace(/^\*\./, '').replace(/^\./, '').toLowerCase())
    .filter(Boolean)
    .map((s) => `.${s}`);
  return exts.length > 0 ? exts : [...SUPPORTED_SCRIPT_EXTS];
}

/**
 * Filtra caminhos pelas extensões de `filePattern` e ordena
 * alfabeticamente (case-insensitive, ordem de execução da pasta). Puro.
 */
export function filterScriptFiles(paths: string[], filePattern: string): string[] {
  const exts = extractExtensions(filePattern);
  return paths
    .filter((p) => exts.some((e) => p.toLowerCase().endsWith(e)))
    .sort((a, b) => {
      const al = a.toLowerCase();
      const bl = b.toLowerCase();
      if (al < bl) return -1;
      if (al > bl) return 1;
      return a < b ? -1 : a > b ? 1 : 0;
    });
}

export interface ScriptRunOptions {
  connection: string;
  statements: SqlStatement[];
  output: { appendLine(value: string): void };
  token?: vscode.CancellationToken;
  autoCommit?: boolean;
  stopOnError?: boolean;
  dbmsOutput?: boolean;
  /** Rótulo (arquivo/pasta) exibido no cabeçalho. */
  label?: string;
  /** Charset usado na leitura — logado no OutputChannel. */
  charset?: string;
}

export interface ScriptRunResult {
  executed: number;
  ok: number;
  failed: number;
  cancelled: boolean;
}

/** Conexão mínima para executar statements (injetável nos testes). */
export interface ScriptDb {
  execute(sql: string, opts: { autoCommit: boolean }): Promise<{ rowsAffected?: number }>;
  enableDbmsOutput?(): Promise<void>;
  drainDbmsOutput?(): Promise<string[]>;
  break?(): Promise<void>;
  close(): Promise<void>;
}

export type ScriptConnect = (connection: string) => Promise<ScriptDb>;

/**
 * Executa statements em sequência, com saída estruturada por statement:
 * `[N] (ok|erro) <duração>ms — <resumo>`. A senha nunca é logada
 * (mensagens passam por `maskConnection`). `stopOnError` (default true)
 * interrompe na primeira falha; cancelamento via `token` + `conn.break()`.
 */
export async function executeScript(
  connect: ScriptConnect,
  options: ScriptRunOptions,
): Promise<ScriptRunResult> {
  const {
    connection,
    statements,
    output,
    token,
    autoCommit = true,
    stopOnError = true,
    dbmsOutput = false,
    label,
    charset,
  } = options;
  const locale = getExtensionLocale();
  const result: ScriptRunResult = { executed: 0, ok: 0, failed: 0, cancelled: false };

  let db: ScriptDb;
  try {
    db = await connect(connection);
  } catch (err) {
    output.appendLine(maskConnection(err instanceof Error ? err.message : String(err)));
    return result;
  }

  const onCancel = (): void => {
    result.cancelled = true;
    db.break?.().catch(() => {});
  };
  const disposable = token?.onCancellationRequested(onCancel);

  try {
    const header = label ?? t(locale, 'script.header.untitled');
    const charsetSuffix = charset ? ` (${charset})` : '';
    output.appendLine(t(locale, 'script.header', { label: `${header}${charsetSuffix}` }));
    if (dbmsOutput) {
      try {
        await db.enableDbmsOutput?.();
      } catch {
        /* best-effort */
      }
    }
    for (const stmt of statements) {
      if (result.cancelled) break;
      const start = Date.now();
      try {
        const execResult = await db.execute(stmt.text, { autoCommit });
        const ms = Date.now() - start;
        result.executed++;
        result.ok++;
        const rows =
          execResult.rowsAffected != null
            ? t(locale, 'script.rows', { count: execResult.rowsAffected })
            : '';
        output.appendLine(
          t(locale, 'script.stmtOk', {
            index: stmt.index + 1,
            ms,
            summary: summarizeStatement(stmt.text),
          }) + rows,
        );
        if (dbmsOutput) {
          try {
            for (const dbmsLine of (await db.drainDbmsOutput?.()) ?? []) {
              output.appendLine(t(locale, 'script.dbms', { line: dbmsLine }));
            }
          } catch {
            /* best-effort */
          }
        }
      } catch (err) {
        const ms = Date.now() - start;
        result.executed++;
        result.failed++;
        const message = maskConnection(err instanceof Error ? err.message : String(err));
        output.appendLine(
          t(locale, 'script.stmtErr', {
            index: stmt.index + 1,
            ms,
            summary: summarizeStatement(stmt.text),
          }),
        );
        output.appendLine(message);
        if (stopOnError) break;
      }
    }
    output.appendLine(
      t(locale, 'script.done', { ok: result.ok, failed: result.failed, executed: result.executed }),
    );
    if (result.cancelled) output.appendLine(t(locale, 'ext.runCancel'));
    return result;
  } finally {
    disposable?.dispose();
    await db.close().catch(() => {});
  }
}

export type OracledbModule = typeof import('oracledb');

/** Superfície mínima da conexão usada pela factory (driver real ou fake). */
export interface ScriptConn {
  execute: (
    sql: string,
    binds: Record<string, unknown>,
    opts?: Record<string, unknown>,
  ) => Promise<{ rowsAffected?: number; outBinds?: unknown }>;
  break: () => Promise<void>;
  close: () => Promise<void>;
  callTimeout: number;
}

/** Constantes do driver para binds de saída (`oracledb` real ou fake). */
export interface DbmsCodes {
  BIND_OUT: unknown;
  STRING: unknown;
  NUMBER: unknown;
}

/**
 * Adapta uma conexão Oracle ao `ScriptDb`: aplica `callTimeout`, executa com
 * `autoCommit` e drena `DBMS_OUTPUT` via `GET_LINE`. Independe de I/O real
 * (testável com conexão fake).
 */
export function createScriptDb(
  conn: ScriptConn,
  codes: DbmsCodes,
  timeoutSeconds: number,
): ScriptDb {
  conn.callTimeout = timeoutSeconds * 1000;
  return {
    async execute(sql: string, execOpts: { autoCommit: boolean }) {
      const r = await conn.execute(sql, {}, { autoCommit: execOpts.autoCommit });
      return { rowsAffected: r.rowsAffected };
    },
    async enableDbmsOutput() {
      await conn.execute(`BEGIN DBMS_OUTPUT.ENABLE(NULL); END;`, {}, { autoCommit: true });
    },
    async drainDbmsOutput() {
      const lines: string[] = [];
      for (;;) {
        const r = await conn.execute(`BEGIN DBMS_OUTPUT.GET_LINE(:line, :status); END;`, {
          line: { dir: codes.BIND_OUT, type: codes.STRING, maxSize: 32767 },
          status: { dir: codes.BIND_OUT, type: codes.NUMBER },
        });
        const out = (r.outBinds ?? {}) as Record<string, unknown>;
        if (Number(out.status) !== 0 || out.line == null) break;
        lines.push(String(out.line));
      }
      return lines;
    },
    async break() {
      await conn.break();
    },
    async close() {
      await conn.close().catch(() => {});
    },
  };
}

/** Conexão do driver tal como entregue pelo pool ou `getConnection`. */
export type OracleConn = import('oracledb').Connection;

/**
 * Adapta a conexão do driver à assinatura mínima da factory e delega ao
 * `createScriptDb`. Separado do `connectOracle` para ser testável sem banco.
 */
export function adaptOracleConn(
  conn: OracleConn,
  oracledb: OracledbModule,
  timeoutSeconds: number,
): ScriptDb {
  // Adapta overloads do driver à assinatura mínima da factory.
  // `bind` é obrigatório: o driver usa `this` internamente.
  const execute = conn.execute.bind(conn) as unknown as ScriptConn['execute'];
  return createScriptDb(
    {
      execute,
      break: () => conn.break(),
      close: () => conn.close(),
      get callTimeout(): number {
        return conn.callTimeout ?? 0;
      },
      set callTimeout(value: number) {
        conn.callTimeout = value;
      },
    },
    oracledb,
    timeoutSeconds,
  );
}

/** Adaptador de produção: abre conexão Oracle direta (thin driver). */
export async function connectOracle(
  connection: string,
  opts: { timeoutSeconds?: number } = {},
): Promise<ScriptDb> {
  let oracledb: OracledbModule;
  try {
    const mod = await import('oracledb');
    oracledb =
      ((mod as Record<string, unknown>).default as OracledbModule) ?? (mod as OracledbModule);
  } catch {
    throw new Error(t(getExtensionLocale(), 'common.oracledbMissing'));
  }
  const { readConfig } = await import('./config.js');
  const pool = await ensurePool(oracledb, connection, readConfig()).catch(() => undefined);
  const conn = pool
    ? await pool.getConnection()
    : await oracledb.getConnection(parseConnString(connection));
  return adaptOracleConn(conn, oracledb, opts.timeoutSeconds ?? 300);
}
