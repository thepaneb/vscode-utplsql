import { getExtensionLocale, readConfig, resolveConnection } from './config';
import { t } from './i18n';
import { logger } from './logger';
import { connectionUser, ensurePool, parseConnString } from './oracleRunner';

/** Tipos de objeto Oracle que aceitam `ALTER … COMPILE DEBUG`. */
export type DebuggableKind = 'package' | 'function' | 'procedure' | 'trigger';

const KIND_BY_EXT: Record<string, DebuggableKind> = {
  '.pks': 'package',
  '.pkb': 'package',
  '.fnc': 'function',
  '.prc': 'procedure',
  '.trg': 'trigger',
};

/** Ordem de tentativa para `.sql` (não indica o tipo do objeto). */
const AMBIGUOUS_KINDS: DebuggableKind[] = ['package', 'procedure', 'function', 'trigger'];

export interface DebuggableFile {
  name: string;
  kinds: DebuggableKind[];
}

/**
 * Deriva o(s) objeto(s) Oracle de um arquivo. `.pks`/`.pkb` → `package`,
 * `.fnc` → `function`, `.prc` → `procedure`, `.trg` → `trigger`. `.sql` é
 * ambíguo e devolve todos os tipos (tentados em ordem na compilação).
 */
export function debuggableFromFile(filePath: string): DebuggableFile | undefined {
  const base = filePath.split(/[\\/]/).pop() ?? '';
  const dot = base.lastIndexOf('.');
  if (dot <= 0) return undefined;
  const name = base.slice(0, dot);
  if (!name) return undefined;
  const ext = base.slice(dot).toLowerCase();
  if (ext === '.sql') return { name, kinds: [...AMBIGUOUS_KINDS] };
  const kind = KIND_BY_EXT[ext];
  return kind ? { name, kinds: [kind] } : undefined;
}

/** `ALTER PACKAGE "OWNER"."NAME" COMPILE DEBUG` (owner/nome em maiúsculas). */
export function compileForDebugSql(kind: DebuggableKind, owner: string, name: string): string {
  return `ALTER ${kind.toUpperCase()} "${owner.toUpperCase()}"."${name.toUpperCase()}" COMPILE DEBUG`;
}

export interface CompileTarget {
  name: string;
  kinds: DebuggableKind[];
  owner?: string;
}

export interface CompileForDebugResult {
  ok: string[];
  failed: { name: string; error: string }[];
}

/** Conexão mínima usada pela compilação (permite fake nos testes). */
export interface CompileConnection {
  execute(sql: string, binds?: unknown, options?: unknown): Promise<unknown>;
}

function isObjectMissing(error: unknown): boolean {
  const e = error as { errorNum?: number; message?: string } | undefined;
  return e?.errorNum === 4043 || (e?.message ?? '').includes('ORA-04043');
}

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Compila os alvos com informação de debug sobre uma conexão. Função pura de
 * orquestração: recebe a conexão e o owner default, não resolve nada externo.
 */
export async function compileTargetsForDebug(
  conn: CompileConnection,
  targets: CompileTarget[],
  defaultOwner: string,
): Promise<CompileForDebugResult> {
  const result: CompileForDebugResult = { ok: [], failed: [] };

  for (const target of targets) {
    const owner = (target.owner ?? defaultOwner).toUpperCase();
    let compiled = false;
    let lastError = '';
    for (const kind of target.kinds) {
      try {
        await conn.execute(compileForDebugSql(kind, owner, target.name), {}, { autoCommit: true });
        result.ok.push(`${kind} ${owner}.${target.name.toUpperCase()}`);
        compiled = true;
        break;
      } catch (e) {
        lastError = errorText(e);
        // `.sql`: tenta o próximo tipo enquanto o objeto não existir
        if (isObjectMissing(e) && target.kinds.length > 1) continue;
        break;
      }
    }
    if (!compiled) result.failed.push({ name: target.name, error: lastError });
  }

  return result;
}

/**
 * Compila os alvos com informação de debug, reusando o pool do runner.
 * Best-effort: nunca lança; devolve o que compilou e o que falhou.
 */
export async function compileForDebug(targets: CompileTarget[]): Promise<CompileForDebugResult> {
  const empty: CompileForDebugResult = { ok: [], failed: [] };
  if (targets.length === 0) return empty;

  let oracledb: typeof import('oracledb');
  try {
    const mod = await import('oracledb');
    oracledb =
      ((mod as Record<string, unknown>).default as typeof import('oracledb')) ??
      (mod as typeof import('oracledb'));
  } catch {
    return {
      ok: [],
      failed: [{ name: '*', error: t(getExtensionLocale(), 'common.oracledbMissing') }],
    };
  }

  const connection = await resolveConnection();
  if (!connection) {
    return { ok: [], failed: [{ name: '*', error: t(getExtensionLocale(), 'ext.noConnection') }] };
  }
  const defaultOwner = connectionUser(connection) ?? '';
  const cfg = readConfig();

  let conn: import('oracledb').Connection;
  try {
    const pool = await ensurePool(oracledb, connection, cfg).catch(() => undefined);
    conn = pool
      ? await pool.getConnection()
      : await oracledb.getConnection(parseConnString(connection));
  } catch (e) {
    return { ok: [], failed: [{ name: '*', error: errorText(e) }] };
  }

  try {
    const result = await compileTargetsForDebug(conn, targets, defaultOwner);
    logger.debug('compileForDebug', { ok: result.ok.length, failed: result.failed.length });
    return result;
  } finally {
    await conn.close().catch(() => {});
  }
}
