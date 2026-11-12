import * as path from 'node:path';
import * as vscode from 'vscode';
import { decodeBytes } from './charset';
import { getExtensionLocale, readConfig } from './config';
import { getActiveProfile } from './connectionProfiles';
import { t } from './i18n';
import { logger } from './logger';
import { oracleMetadataCache } from './metadataCache';
import {
  beginOracleActivity,
  ensurePool,
  getOracleInfo,
  parseConnString,
  semverLt,
} from './oracleRunner';
import { hasTraversalSegment, isInside } from './pathContainment';
import { redactConnection } from './redact';
import { isRetryable, retryWithBackoff } from './retry';
import { parseSuiteText, type TestProc } from './suiteParser';

export interface SuiteFile {
  uri: vscode.Uri;
  packageName: string;
  suiteDescription: string;
  tests: TestProc[];
  folder: vscode.WorkspaceFolder;
  suiteLine: number;
  disabled?: boolean;
  /** Tags do header da suíte (`%tags` antes do primeiro `%test`) — PRD-51. */
  tags?: string[];
  hasBeforeAll?: boolean;
  hasAfterAll?: boolean;
  hasBeforeEach?: boolean;
  hasAfterEach?: boolean;
  /** Schema Oracle de onde a suite foi descoberta (apenas descoberta via DB). */
  dbSchema?: string;
}

type ParsedSuite = Omit<SuiteFile, 'folder'>;

function resolveFolder(
  uri: vscode.Uri,
  folders: readonly vscode.WorkspaceFolder[],
): vscode.WorkspaceFolder {
  let best: vscode.WorkspaceFolder | undefined;
  let bestLen = 0;
  for (const f of folders) {
    // `isInside` usa path.relative: `/ws/a` não casa `/ws/ab` (PRD-131 RF7).
    if (!isInside(uri.fsPath, f.uri.fsPath)) continue;
    const len = f.uri.fsPath.length;
    if (len > bestLen) {
      best = f;
      bestLen = len;
    }
  }
  return best ?? folders[0];
}

export function parseSuite(uri: vscode.Uri, text: string): ParsedSuite | null {
  const parsed = parseSuiteText(text);
  if (!parsed) {
    return null;
  }
  return { uri, ...parsed };
}

/**
 * Lê e parseia **um** arquivo (PRD-103). Devolve `undefined` para arquivo
 * ilegível/sem suite habilitada — o chamador decide entre incremental e full.
 */
export async function discoverUri(
  uri: vscode.Uri,
  folders?: readonly vscode.WorkspaceFolder[],
): Promise<SuiteFile | undefined> {
  const targets = folders ?? vscode.workspace.workspaceFolders ?? [];
  try {
    const bytes = await vscode.workspace.fs.readFile(uri);
    const text = decodeBytes(bytes, getActiveProfile()?.charset);
    const suite = parseSuite(uri, text);
    if (!suite || suite.disabled || suite.tests.length === 0) return undefined;
    const tests = suite.tests.filter((t) => !t.disabled);
    if (tests.length === 0) return undefined;
    return { ...suite, tests, folder: resolveFolder(uri, targets) };
  } catch (e) {
    logger.debug('discovery: arquivo ilegível', { uri: uri.toString(), error: String(e) });
    return undefined;
  }
}

export async function discoverWorkspace(
  patterns: string[],
  folders?: readonly vscode.WorkspaceFolder[],
): Promise<SuiteFile[]> {
  const results: SuiteFile[] = [];
  const seen = new Set<string>();
  const targets = folders ?? vscode.workspace.workspaceFolders ?? [];

  for (const pattern of patterns) {
    const uris = await vscode.workspace.findFiles(pattern, '**/node_modules/**');
    for (const uri of uris) {
      if (seen.has(uri.toString())) continue;
      seen.add(uri.toString());
      const suite = await discoverUri(uri, targets);
      if (suite) results.push(suite);
    }
  }

  return results;
}

/** Normaliza separadores e casing da letra de drive (Windows é case-insensitive). */
function normalizeFsPath(p: string): string {
  return p.replace(/\\/g, '/').replace(/^([a-zA-Z]):/, (_m, d: string) => `${d.toLowerCase()}:`);
}

/** Letra de drive (`c:`) já normalizada, ou undefined em paths POSIX. */
function driveOf(normPath: string): string | undefined {
  return /^([a-zA-Z]:)/.exec(normPath)?.[1].toLowerCase();
}

export function extractSchemaFromPath(
  filePath: string,
  workspaceFsPath: string,
  schemaPattern: string,
): string | undefined {
  const normFile = normalizeFsPath(filePath);
  const normWs = normalizeFsPath(workspaceFsPath);
  const fileDrive = driveOf(normFile);
  const wsDrive = driveOf(normWs);
  if (fileDrive && wsDrive && fileDrive !== wsDrive) return undefined;

  const relative = path.posix.relative(normWs, normFile);
  if (relative.startsWith('..')) return undefined;

  const escaped = schemaPattern
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    .replace('\\{schema\\}', '([^/]+)')
    .replace(/\\\*\\\*/g, '.*')
    .replace(/\\\*/g, '[^/]*');

  const regex = new RegExp(`^${escaped}$`);
  const match = regex.exec(relative);
  // Padrão sem `{schema}` (sem grupo de captura) → undefined (caller usa UNKNOWN).
  return match?.[1] ? match[1].toUpperCase() : undefined;
}

// ── Descoberta via banco (PRD-43) ────────────────────────────────────

/** Conexão mínima usada pela descoberta via DB (assinatura compatível com oracledb). */
export interface DiscoveryConnection {
  execute(
    sql: string,
    bindParams?: Record<string, unknown>,
    options?: Record<string, unknown>,
  ): Promise<{ rows?: unknown[] }>;
}

const ALL_SOURCE_MAX_ROWS = 10_000;

function rowValue(row: unknown, index: number, key: string): string {
  if (Array.isArray(row)) {
    return String(row[index] ?? '');
  }
  const o = row as Record<string, unknown>;
  return String(o[key] ?? o[key.toLowerCase()] ?? '');
}

/**
 * Descobre suites utPLSQL de um schema Oracle via ALL_OBJECTS + ALL_SOURCE.
 * Packages `UT_*` são ignorados (são o próprio framework utPLSQL).
 * Fallback silencioso: se ALL_SOURCE não estiver acessível, pula o package.
 */
export async function discoverSchemaFromConn(
  conn: DiscoveryConnection,
  schema: string,
  folder: vscode.WorkspaceFolder,
): Promise<SuiteFile[]> {
  const upper = schema.toUpperCase();
  const pkgs = await conn.execute(
    `SELECT object_name FROM all_objects
     WHERE owner = :schema AND object_type = 'PACKAGE' AND status = 'VALID'`,
    { schema: upper },
  );

  const names: string[] = [];
  for (const row of pkgs.rows ?? []) {
    const pkgName = rowValue(row, 0, 'OBJECT_NAME');
    if (!pkgName || /^UT_/i.test(pkgName)) continue;
    names.push(pkgName);
  }

  // Concorrência limitada (PRD-131 RF6): mantém uma query por package (e o
  // limite/warning de 10k linhas), mas evita o N+1 serial em schemas grandes.
  const results = new Map<string, SuiteFile>();
  const queue = [...names];
  const concurrency = Math.min(8, queue.length);
  const workers = Array.from({ length: concurrency }, async () => {
    while (queue.length > 0) {
      const pkgName = queue.shift();
      if (!pkgName) break;
      const suite = await discoverPackageSuite(conn, upper, pkgName, folder);
      if (suite) results.set(pkgName, suite);
    }
  });
  await Promise.all(workers);
  return names
    .map((name) => results.get(name))
    .filter((suite): suite is SuiteFile => suite !== undefined);
}

/** Lê o fonte de um package e o converte em `SuiteFile` (ou `undefined`). */
async function discoverPackageSuite(
  conn: DiscoveryConnection,
  schema: string,
  pkgName: string,
  folder: vscode.WorkspaceFolder,
): Promise<SuiteFile | undefined> {
  let text: string;
  try {
    const source = await conn.execute(
      // Forma portátil (11.2+): `FETCH FIRST` é 12c+ e, dentro do try com
      // fallback silencioso, degradava a descoberta no 11g sem erro visível.
      `SELECT text FROM (
         SELECT text FROM all_source
         WHERE owner = :schema AND name = :name AND type = 'PACKAGE'
         ORDER BY line
       ) WHERE ROWNUM <= ${ALL_SOURCE_MAX_ROWS}`,
      { schema, name: pkgName },
    );
    const rows = source.rows ?? [];
    if (rows.length >= ALL_SOURCE_MAX_ROWS) {
      logger.warn(
        t(getExtensionLocale(), 'discovery.sourceTruncated', {
          schema,
          name: pkgName,
          max: ALL_SOURCE_MAX_ROWS,
        }),
      );
    }
    text = `CREATE OR REPLACE ${rows.map((r) => rowValue(r, 0, 'TEXT')).join('\n')}`;
  } catch (e) {
    // ALL_SOURCE inacessível (ex.: ORA-00942) — fallback silencioso
    logger.debug('discoverSchemaFromConn: ALL_SOURCE inacessível', {
      schema,
      name: pkgName,
      error: String(e),
    });
    return undefined;
  }

  const parsed = parseSuiteText(text);
  if (!parsed || parsed.disabled || parsed.tests.length === 0) return undefined;
  const tests = parsed.tests.filter((test) => !test.disabled);
  if (tests.length === 0) return undefined;

  const uri = vscode.Uri.parse(`utplsql-db:/${schema}/${pkgName}.pks`);
  return { uri, ...parsed, tests, folder, dbSchema: schema };
}

async function loadOracledb(): Promise<typeof import('oracledb')> {
  const mod = await import('oracledb');
  return (
    ((mod as Record<string, unknown>).default as typeof import('oracledb')) ??
    (mod as typeof import('oracledb'))
  );
}

// ── Descoberta via API de metadados (PRD-74) ─────────────────────────

/** Versão mínima do utPLSQL que expõe `ut_runner.get_suites_info` (3.1.3). */
export const UTPLSQL_SUITES_INFO_MIN_VERSION = '3.1.3';

export interface DbSuiteRow {
  owner: string;
  packageName: string;
  suitePath: string | null;
  itemName: string;
  itemType: 'suite' | 'context' | 'test';
  description: string | null;
  disabled: boolean;
  tags: string[];
  /** Linha 1-based informada pelo banco. */
  line: number;
}

function mapItemType(raw: string): DbSuiteRow['itemType'] | undefined {
  const v = raw.toUpperCase();
  if (v === 'UT_SUITE') return 'suite';
  if (v === 'UT_SUITE_CONTEXT') return 'context';
  if (v === 'UT_TEST') return 'test';
  return undefined;
}

function parseTagList(raw: string): string[] {
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Consulta `ut_runner.get_suites_info(owner, null)` e normaliza as linhas.
 * Nunca lança: API ausente/inacessível (ORA) ⇒ `[]`.
 */
export async function getSuitesInfo(
  conn: DiscoveryConnection,
  owner: string,
  cacheKey?: string,
): Promise<DbSuiteRow[]> {
  const key = cacheKey ? `suites|${cacheKey}|${owner.toUpperCase()}` : undefined;
  if (key) {
    const cached = oracleMetadataCache.get<DbSuiteRow[]>(key);
    if (cached !== undefined) return cached;
  }
  let rows: DbSuiteRow[] = [];
  try {
    const result = await conn.execute(
      `SELECT object_owner, object_name, item_name, item_description, item_type,
              item_line_no, path, disabled_flag, disabled_reason, tags
         FROM TABLE(ut_runner.get_suites_info(:owner, null))`,
      { owner: owner.toUpperCase() },
    );
    for (const row of result.rows ?? []) {
      const itemType = mapItemType(rowValue(row, 4, 'ITEM_TYPE'));
      if (!itemType) continue;
      rows.push({
        owner: rowValue(row, 0, 'OBJECT_OWNER').trim().toUpperCase(),
        packageName: rowValue(row, 1, 'OBJECT_NAME'),
        itemName: rowValue(row, 2, 'ITEM_NAME'),
        description: rowValue(row, 3, 'ITEM_DESCRIPTION') || null,
        itemType,
        line: Number(rowValue(row, 5, 'ITEM_LINE_NO')) || 0,
        suitePath: rowValue(row, 6, 'PATH') || null,
        disabled: Number(rowValue(row, 7, 'DISABLED_FLAG')) === 1,
        tags: parseTagList(rowValue(row, 9, 'TAGS')),
      });
    }
  } catch (e) {
    logger.debug('getSuitesInfo: ut_runner.get_suites_info indisponível', {
      owner,
      error: String(e),
    });
    rows = [];
  }
  if (key) oracleMetadataCache.set(key, rows, readConfig().discoveryCacheTtlSeconds * 1000);
  return rows;
}

/**
 * Converte as linhas de `get_suites_info` em `SuiteFile` com URI virtual
 * (`utplsql-db:/OWNER/PKG.pks`). Itens `disabled` são omitidos, como na
 * descoberta por arquivo.
 */
export function mapSuitesInfoToSuiteFiles(
  rows: DbSuiteRow[],
  folder: vscode.WorkspaceFolder,
): SuiteFile[] {
  const byPackage = new Map<string, DbSuiteRow[]>();
  for (const row of rows) {
    const key = `${row.owner}/${row.packageName}`.toLowerCase();
    const list = byPackage.get(key) ?? [];
    list.push(row);
    byPackage.set(key, list);
  }

  const results: SuiteFile[] = [];
  for (const list of byPackage.values()) {
    const owner = list[0].owner;
    const packageName = list[0].packageName;
    const suiteRow = list.find((r) => r.itemType === 'suite');
    if (suiteRow?.disabled) continue;

    const tests: TestProc[] = list
      .filter((r) => r.itemType === 'test' && !r.disabled)
      .map((r) => ({
        procName: r.itemName,
        description: r.description ?? '',
        line: Math.max(0, r.line - 1),
        ...(r.tags.length > 0 ? { tags: r.tags } : {}),
      }));
    if (tests.length === 0) continue;

    const uri = vscode.Uri.parse(`utplsql-db:/${owner}/${packageName}.pks`);
    results.push({
      uri,
      packageName,
      suiteDescription: suiteRow?.description ?? '',
      tests,
      folder,
      suiteLine: Math.max(0, (suiteRow?.line ?? 1) - 1),
      dbSchema: owner,
      ...(suiteRow && suiteRow.tags.length > 0 ? { tags: suiteRow.tags } : {}),
    });
  }
  return results;
}

/**
 * Fusão DB-first (PRD-74 RF3): a lista final é a união por `LOWER(packageName)`.
 * Quando existe suite vinda de arquivo, ela prevalece em `uri`/`range`/`folder`;
 * o banco manda na descrição e nas tags. Testes só-arquivo e só-banco são
 * preservados e o input não é mutado (PRD-148 RF5). Suíte só-banco entra com
 * URI virtual.
 */
export function mergeSuiteLists(fileSuites: SuiteFile[], dbSuites: SuiteFile[]): SuiteFile[] {
  // Clona a camada que pode ser mesclada; os testes em si só são substituídos
  // por objetos novos quando recebem metadados do banco.
  const result: SuiteFile[] = fileSuites.map((s) => ({ ...s, tests: [...s.tests] }));
  const byPackage = new Map<string, SuiteFile[]>();
  for (const suite of result) {
    const key = suite.packageName.toLowerCase();
    const list = byPackage.get(key) ?? [];
    list.push(suite);
    byPackage.set(key, list);
  }
  const used = new Set<SuiteFile>();

  for (const db of dbSuites) {
    const key = db.packageName.toLowerCase();
    const candidates = byPackage.get(key) ?? [];
    const file = candidates.find((s) => !used.has(s));
    if (!file) {
      const dbOnly: SuiteFile = { ...db, tests: [...db.tests] };
      result.push(dbOnly);
      candidates.push(dbOnly);
      byPackage.set(key, candidates);
      used.add(dbOnly);
      continue;
    }

    used.add(file);
    const dbTests = new Map(db.tests.map((t) => [t.procName.toLowerCase(), t]));
    const fileNames = new Set(file.tests.map((t) => t.procName.toLowerCase()));
    const tests: TestProc[] = file.tests.map((fileTest) => {
      const dbTest = dbTests.get(fileTest.procName.toLowerCase());
      if (!dbTest) return fileTest;
      return {
        ...fileTest,
        ...(dbTest.description ? { description: dbTest.description } : {}),
        ...(dbTest.tags && dbTest.tags.length > 0 ? { tags: dbTest.tags } : {}),
      };
    });
    // Testes que só existem no banco entram no fim, preservando os do arquivo.
    for (const dbTest of db.tests) {
      if (!fileNames.has(dbTest.procName.toLowerCase())) tests.push(dbTest);
    }
    file.tests = tests;
    if (db.suiteDescription) file.suiteDescription = db.suiteDescription;
    // Banco prevalece nas tags de suíte, como nas de teste (PRD-74 RF3/PRD-51).
    if (db.tags && db.tags.length > 0) file.tags = db.tags;
  }
  return result;
}

/**
 * Descoberta DB-first: usa `ut_runner.get_suites_info` quando a versão do
 * utPLSQL é >= 3.1.3 e cai para `ALL_SOURCE` (PRD-43) quando a API não está
 * disponível. Com `utplsql.discovery.source = "database"` não há fallback;
 * com `"file"` a descoberta via banco nem é chamada (ver `mergeDbSuites`).
 */
export async function discoverDbSuites(
  connStr: string,
  schema: string,
  folders: readonly vscode.WorkspaceFolder[],
  loadOracledbMod: () => Promise<typeof import('oracledb')> = loadOracledb,
): Promise<SuiteFile[]> {
  // PRD-101: discovery via banco é uma atividade Oracle como as demais.
  const activity = beginOracleActivity();
  const cfg = readConfig();
  try {
    return await retryWithBackoff(
      () => discoverDbSuitesCore(connStr, schema, folders, loadOracledbMod),
      {
        attempts: cfg.discoveryRetryAttempts,
        isRetryable,
        onRetry: (error, attempt) => {
          logger.warn('discoverDbSuites: nova tentativa após falha transitória', {
            attempt,
            schema,
            error: redactConnection(String(error), connStr),
          });
        },
      },
    );
  } catch (e) {
    logger.debug('discoverDbSuites: descoberta via banco falhou', {
      schema,
      error: redactConnection(String(e), connStr),
    });
    return [];
  } finally {
    await activity.end();
  }
}

async function discoverDbSuitesCore(
  connStr: string,
  schema: string,
  folders: readonly vscode.WorkspaceFolder[],
  loadOracledbMod: () => Promise<typeof import('oracledb')> = loadOracledb,
): Promise<SuiteFile[]> {
  if (folders.length === 0) return [];
  const cfg = readConfig();
  const folder =
    (await resolveFolderForSchema(schema, folders, cfg.organizationSchemaPattern)) ?? folders[0];
  if (!folder) return [];

  let oracledb: typeof import('oracledb');
  try {
    oracledb = await loadOracledbMod();
  } catch (e) {
    logger.debug('discoverDbSuites: oracledb indisponível', {
      error: redactConnection(String(e), connStr),
    });
    return [];
  }

  const pool = await ensurePool(oracledb, connStr, cfg).catch(() => undefined);
  const conn = pool
    ? await pool.getConnection()
    : await oracledb.getConnection(parseConnString(connStr));

  const prevTimeout = conn.callTimeout;
  try {
    conn.callTimeout = 10_000;
    const { utVersion } = await getOracleInfo(conn);
    const apiAvailable = !utVersion || !semverLt(utVersion, UTPLSQL_SUITES_INFO_MIN_VERSION);
    if (apiAvailable) {
      const rows = await getSuitesInfo(conn, schema, connStr);
      if (rows.length > 0) return mapSuitesInfoToSuiteFiles(rows, folder);
    }
    if (cfg.discoverySource === 'database') return [];
    return await discoverSchemaFromConn(conn, schema, folder);
  } catch (e) {
    if (isRetryable(e)) throw e;
    logger.debug('discoverDbSuites: descoberta via banco falhou', {
      schema,
      error: redactConnection(String(e), connStr),
    });
    return [];
  } finally {
    conn.callTimeout = prevTimeout;
    await conn.close().catch(() => {});
  }
}

/**
 * Resolve o workspace folder do schema pelo layout `organization.schemaPattern`
 * (`db/{schema}/**` → `db/<SCHEMA>`). Sem diretório correspondente, usa o
 * primeiro folder (comportamento legado).
 */
async function resolveFolderForSchema(
  schema: string,
  folders: readonly vscode.WorkspaceFolder[],
  pattern: string,
): Promise<vscode.WorkspaceFolder | undefined> {
  if (folders.length <= 1) return folders[0];
  const base = schemaBase(pattern);
  if (base === undefined) return folders[0];
  const segments = base.split('/').filter(Boolean);
  for (const folder of folders) {
    let dir = folder.uri;
    for (const segment of segments) dir = vscode.Uri.joinPath(dir, segment);
    const candidate = vscode.Uri.joinPath(dir, schema);
    try {
      const stat = await vscode.workspace.fs.stat(candidate);
      if (stat.type === vscode.FileType.Directory) return folder;
    } catch {
      /* schema não está neste folder */
    }
  }
  return folders[0];
}

/**
 * Descoberta via banco completa: abre conexão (pool do PRD-38), timeout de 10s,
 * e delega para `discoverSchemaFromConn`. Nunca lança — retorna [] em qualquer
 * falha (Oracle indisponível, sem acesso, timeout).
 */
export async function discoverSchemaFromDb(
  connStr: string,
  schema: string,
  folders: readonly vscode.WorkspaceFolder[],
  loadOracledbMod: () => Promise<typeof import('oracledb')> = loadOracledb,
): Promise<SuiteFile[]> {
  const activity = beginOracleActivity();
  const cfg = readConfig();
  try {
    return await retryWithBackoff(
      () => discoverSchemaFromDbCore(connStr, schema, folders, loadOracledbMod),
      {
        attempts: cfg.discoveryRetryAttempts,
        isRetryable,
        onRetry: (error, attempt) => {
          logger.warn('discoverSchemaFromDb: nova tentativa após falha transitória', {
            attempt,
            schema,
            error: redactConnection(String(error), connStr),
          });
        },
      },
    );
  } catch (e) {
    logger.debug('discoverSchemaFromDb: descoberta via banco falhou', {
      schema,
      error: redactConnection(String(e), connStr),
    });
    return [];
  } finally {
    await activity.end();
  }
}

async function discoverSchemaFromDbCore(
  connStr: string,
  schema: string,
  folders: readonly vscode.WorkspaceFolder[],
  loadOracledbMod: () => Promise<typeof import('oracledb')> = loadOracledb,
): Promise<SuiteFile[]> {
  if (folders.length === 0) return [];
  const cfg = readConfig();
  const folder =
    (await resolveFolderForSchema(schema, folders, cfg.organizationSchemaPattern)) ?? folders[0];
  if (!folder) return [];

  let oracledb: typeof import('oracledb');
  try {
    oracledb = await loadOracledbMod();
  } catch (e) {
    logger.debug('discoverSchemaFromDb: oracledb indisponível', {
      error: redactConnection(String(e), connStr),
    });
    return [];
  }

  const pool = await ensurePool(oracledb, connStr, cfg).catch(() => undefined);
  const conn = pool
    ? await pool.getConnection()
    : await oracledb.getConnection(parseConnString(connStr));

  const prevTimeout = conn.callTimeout;
  try {
    conn.callTimeout = 10_000;
    return await discoverSchemaFromConn(conn, schema, folder);
  } catch (e) {
    if (isRetryable(e)) throw e;
    logger.debug('discoverSchemaFromDb: descoberta via banco falhou', {
      schema,
      error: redactConnection(String(e), connStr),
    });
    return [];
  } finally {
    conn.callTimeout = prevTimeout;
    await conn.close().catch(() => {});
  }
}

function schemaBase(pattern: string): string | undefined {
  const idx = pattern.indexOf('{schema}');
  if (idx < 0) return undefined;
  return pattern.slice(0, idx).replace(/\/+$/, '');
}
/**
 * Enumera schemas candidatos a partir do layout dos workspace folders:
 * lista os diretórios imediatamente abaixo da base do `organizationSchemaPattern`.
 * Ex.: padrão `db/{schema}/**` → diretórios dentro de `db/` de cada folder.
 */
export async function discoverSchemasFromFolders(
  folders: readonly vscode.WorkspaceFolder[],
  schemaPattern: string,
): Promise<string[]> {
  const base = schemaBase(schemaPattern);
  if (base === undefined) return [];
  const segments = base.split('/').filter(Boolean);
  // Mitiga path traversal via `organization.schemaPattern` (workspace
  // malicioso): rejeita segmentos que escapam da raiz do folder, inclusive
  // `..\` no Windows e caminhos absolutos de qualquer plataforma.
  if (
    segments.some((s) => hasTraversalSegment(s) || path.isAbsolute(s) || path.win32.isAbsolute(s))
  ) {
    return [];
  }
  const schemas = new Set<string>();
  const attempts = readConfig().discoveryRetryAttempts;

  for (const folder of folders) {
    let dir = folder.uri;
    for (const seg of segments) {
      dir = vscode.Uri.joinPath(dir, seg);
    }
    // Confere que o diretório resolvido permanece dentro do folder.
    if (!isInside(dir.fsPath, folder.uri.fsPath)) continue;
    let entries: [string, vscode.FileType][];
    try {
      entries = await retryWithBackoff(
        () => Promise.resolve(vscode.workspace.fs.readDirectory(dir)),
        {
          attempts,
          isRetryable,
        },
      );
    } catch (e) {
      logger.debug('discoverSchemasFromFolders: pasta base ausente', {
        dir: dir.fsPath,
        error: String(e),
      });
      continue; // pasta base não existe neste folder
    }
    for (const [name, type] of entries) {
      if (type === vscode.FileType.Directory) {
        schemas.add(name.toUpperCase());
      }
    }
  }

  return [...schemas].sort();
}
