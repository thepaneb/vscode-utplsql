import * as path from 'node:path';
import * as vscode from 'vscode';
import { readConfig } from './config';
import { ensurePool, parseConnString } from './oracleRunner';
import { parseSuiteText, type TestProc } from './suiteParser';

export interface SuiteFile {
  uri: vscode.Uri;
  packageName: string;
  suiteDescription: string;
  tests: TestProc[];
  folder: vscode.WorkspaceFolder;
  suiteLine: number;
  disabled?: boolean;
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
  const uriStr = uri.toString().toLowerCase();
  let best: vscode.WorkspaceFolder | undefined;
  let bestLen = 0;
  for (const f of folders) {
    const prefix = f.uri.toString().toLowerCase();
    if (uriStr.startsWith(prefix) && prefix.length > bestLen) {
      best = f;
      bestLen = prefix.length;
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
      if (seen.has(uri.toString())) {
        continue;
      }
      seen.add(uri.toString());
      try {
        const bytes = await vscode.workspace.fs.readFile(uri);
        const text = Buffer.from(bytes).toString('utf8');
        const suite = parseSuite(uri, text);
        if (suite && !suite.disabled && suite.tests.length > 0) {
          const tests = suite.tests.filter((t) => !t.disabled);
          if (tests.length > 0) {
            const folder = resolveFolder(uri, targets);
            results.push({ ...suite, tests, folder });
          }
        }
      } catch {
        // arquivo ilegível — ignora
      }
    }
  }

  return results;
}

export function extractSchemaFromPath(
  filePath: string,
  workspaceFsPath: string,
  schemaPattern: string,
): string | undefined {
  const normFile = filePath.replace(/\\/g, '/');
  const normWs = workspaceFsPath.replace(/\\/g, '/');
  const relative = path.posix.relative(normWs, normFile);
  if (relative.startsWith('..')) return undefined;

  const escaped = schemaPattern
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    .replace('\\{schema\\}', '([^/]+)')
    .replace(/\\\*\\\*/g, '.*')
    .replace(/\\\*/g, '[^/]*');

  const regex = new RegExp(`^${escaped}$`);
  const match = regex.exec(relative);
  return match ? match[1].toUpperCase() : undefined;
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

  const results: SuiteFile[] = [];
  for (const row of pkgs.rows ?? []) {
    const pkgName = rowValue(row, 0, 'OBJECT_NAME');
    if (!pkgName || /^UT_/i.test(pkgName)) continue;

    let text: string;
    try {
      const source = await conn.execute(
        `SELECT text FROM all_source
         WHERE owner = :schema AND name = :name AND type = 'PACKAGE'
         ORDER BY line FETCH FIRST ${ALL_SOURCE_MAX_ROWS} ROWS ONLY`,
        { schema: upper, name: pkgName },
      );
      const rows = source.rows ?? [];
      if (rows.length >= ALL_SOURCE_MAX_ROWS) {
        console.warn(
          `[utplsql] Fonte de ${upper}.${pkgName} truncada em ${ALL_SOURCE_MAX_ROWS} linhas na descoberta via DB.`,
        );
      }
      text = `CREATE OR REPLACE ${rows.map((r) => rowValue(r, 0, 'TEXT')).join('\n')}`;
    } catch {
      // ALL_SOURCE inacessível (ex.: ORA-00942) — fallback silencioso
      continue;
    }

    const parsed = parseSuiteText(text);
    if (!parsed || parsed.disabled || parsed.tests.length === 0) continue;
    const tests = parsed.tests.filter((t) => !t.disabled);
    if (tests.length === 0) continue;

    const uri = vscode.Uri.parse(`utplsql-db:/${upper}/${pkgName}.pks`);
    results.push({ uri, ...parsed, tests, folder, dbSchema: upper });
  }
  return results;
}

async function loadOracledb(): Promise<typeof import('oracledb')> {
  const mod = await import('oracledb');
  return (
    ((mod as Record<string, unknown>).default as typeof import('oracledb')) ??
    (mod as typeof import('oracledb'))
  );
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
  const folder = folders[0];
  if (!folder) return [];

  let oracledb: typeof import('oracledb');
  try {
    oracledb = await loadOracledbMod();
  } catch {
    return []; // Oracle indisponível — fallback silencioso (modo auto/CLI)
  }

  const cfg = readConfig();
  const pool = await ensurePool(oracledb, connStr, cfg).catch(() => undefined);
  let conn: import('oracledb').Connection;
  try {
    conn = pool
      ? await pool.getConnection()
      : await oracledb.getConnection(parseConnString(connStr));
  } catch {
    return [];
  }

  try {
    conn.callTimeout = 10_000;
    return await discoverSchemaFromConn(conn, schema, folder);
  } catch {
    return []; // fallback silencioso
  } finally {
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
  const schemas = new Set<string>();

  for (const folder of folders) {
    let dir = folder.uri;
    for (const seg of segments) {
      dir = vscode.Uri.joinPath(dir, seg);
    }
    let entries: [string, vscode.FileType][];
    try {
      entries = await vscode.workspace.fs.readDirectory(dir);
    } catch {
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
