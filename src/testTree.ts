import * as vscode from 'vscode';
import { getExtensionLocale, readConfig, resolveConnectionNoPrompt } from './config';
import { clearDbSourceCache } from './dbSourceProvider';
import {
  discoverDbSuites,
  discoverSchemasFromFolders,
  discoverWorkspace,
  extractSchemaFromPath,
  mergeSuiteLists,
  type SuiteFile,
} from './discovery';
import { t } from './i18n';
import type { TestStateManager } from './state';

/** Id de suite normalizado (`suite:<pkg lower>`). */
function suiteId(packageName: string): string {
  return `suite:${packageName.toLowerCase()}`;
}

function fillSuiteTests(
  controller: vscode.TestController,
  state: TestStateManager,
  suiteItem: vscode.TestItem,
  suite: SuiteFile,
): void {
  for (const t of suite.tests) {
    const testItem = controller.createTestItem(
      `test:${suite.packageName.toLowerCase()}.${t.procName.toLowerCase()}`,
      t.displayName ?? t.description,
      suite.uri,
    );
    testItem.range = new vscode.Range(t.line, 0, t.line, 0);
    state.setMeta(testItem, {
      kind: 'test',
      packageName: suite.packageName,
      procName: t.procName,
      description: t.displayName ?? t.description,
      uri: suite.uri,
      folder: suite.folder,
    });
    suiteItem.children.add(testItem);
    state.setItem(testItem.id, testItem);
  }
}

/** Cria o nó `suite:` (sem testes — lazy) e registra meta/mapa. */
function addSuiteItem(
  controller: vscode.TestController,
  state: TestStateManager,
  parent: vscode.TestItem | undefined,
  suite: SuiteFile,
): vscode.TestItem {
  const id = suiteId(suite.packageName);
  const suiteItem = controller.createTestItem(
    id,
    `${suite.suiteDescription}  (${suite.packageName})`,
    suite.uri,
  );
  state.setMeta(suiteItem, {
    kind: 'suite',
    packageName: suite.packageName,
    uri: suite.uri,
    folder: suite.folder,
  });
  suiteItem.range = new vscode.Range(suite.suiteLine, 0, suite.suiteLine, 0);
  suiteItem.canResolveChildren = true;
  if (parent) parent.children.add(suiteItem);
  else controller.items.add(suiteItem);
  state.cachedItems.push(suiteItem);
  state.setSuiteItem(id, suiteItem);
  state.setItem(id, suiteItem);
  state.setSuiteFile(id, suite);
  return suiteItem;
}

/**
 * Constrói a árvore do Test Explorer quando `utplsql.organization` = `file`.
 * Modo arquivo é naturalmente por arquivo — construído de uma vez.
 * Exportado para testes (RF2).
 */
export function buildFileTree(
  controller: vscode.TestController,
  state: TestStateManager,
  suites: SuiteFile[],
): void {
  for (const suite of suites) {
    const suiteItem = addSuiteItem(controller, state, undefined, suite);
    suiteItem.canResolveChildren = false;
    fillSuiteTests(controller, state, suiteItem, suite);
  }
}

/** Schema do suite (banco ou extraído do path); `UNKNOWN` como fallback. */
function schemaOf(
  suite: SuiteFile,
  schemaPattern: string,
  extract = extractSchemaFromPath,
): string {
  return (
    suite.dbSchema ?? extract(suite.uri.fsPath, suite.folder.uri.fsPath, schemaPattern) ?? 'UNKNOWN'
  );
}

function sortSchemas(schemas: Iterable<string>): string[] {
  return [...schemas].sort((a, b) => {
    if (a === 'UNKNOWN') return 1;
    if (b === 'UNKNOWN') return -1;
    return a.localeCompare(b);
  });
}

/**
 * Cria os nós de **schema** do modo `schema` (PRD-75): só o primeiro nível é
 * materializado; package/suite/teste são resolvidos sob demanda pelo
 * `resolveHandler`. `extraSchemas` cobre schemas derivados de pastas (sem
 * arquivo). Exportado para testes.
 */
export function buildSchemaTree(
  controller: vscode.TestController,
  state: TestStateManager,
  suites: SuiteFile[],
  schemaPattern: string,
  extraSchemas: string[] = [],
): void {
  const locale = getExtensionLocale();
  state.setDiscoveredFiles(suites);

  const schemas = new Set<string>(extraSchemas);
  for (const suite of suites) schemas.add(schemaOf(suite, schemaPattern));

  for (const schema of sortSchemas(schemas)) {
    const item = controller.createTestItem(
      `schema:${schema}`,
      t(locale, 'testTree.schemaNode', { schema }),
      undefined,
    );
    item.canResolveChildren = true;
    controller.items.add(item);
    state.setItem(item.id, item);
  }
}

/** Dependências dos resolvedores (injetáveis nos testes). */
export interface TreeResolveDeps {
  resolveConnection(): string | undefined;
  extractSchemaFromPath(
    filePath: string,
    workspaceFsPath: string,
    schemaPattern: string,
  ): string | undefined;
  discoverDbSuites(
    connStr: string,
    schema: string,
    folders: readonly vscode.WorkspaceFolder[],
  ): Promise<SuiteFile[]>;
}

const defaultResolveDeps: TreeResolveDeps = {
  resolveConnection: resolveConnectionNoPrompt,
  extractSchemaFromPath,
  discoverDbSuites,
};

/** Resolve um nó `schema:` → filhos `package:` (arquivos + banco do schema). */
export async function resolveSchemaNode(
  controller: vscode.TestController,
  state: TestStateManager,
  item: vscode.TestItem,
  deps: TreeResolveDeps = defaultResolveDeps,
): Promise<void> {
  if (state.isResolved(item.id)) return;
  const schema = item.id.slice('schema:'.length);
  const cfg = readConfig();
  const folders = vscode.workspace.workspaceFolders ?? [];

  const fileSuites = state.discoveredFiles.filter(
    (s) => schemaOf(s, cfg.organizationSchemaPattern, deps.extractSchemaFromPath) === schema,
  );

  let suites = fileSuites;
  if (cfg.discoverySource !== 'file') {
    const conn = deps.resolveConnection();
    if (conn) {
      const dbSuites = await deps.discoverDbSuites(conn, schema, folders);
      suites = mergeSuiteLists(fileSuites, dbSuites);
    }
  }
  state.setSchemaSuites(schema, suites);

  const byPackage = new Map<string, SuiteFile[]>();
  for (const s of suites) {
    if (!byPackage.has(s.packageName)) byPackage.set(s.packageName, []);
    byPackage.get(s.packageName)?.push(s);
  }
  const locale = getExtensionLocale();
  for (const [pkg, list] of byPackage) {
    const pkgItem = controller.createTestItem(
      `package:${schema}:${pkg}`,
      t(locale, 'testTree.packageNode', { package: pkg }),
      list[0].uri,
    );
    pkgItem.canResolveChildren = true;
    item.children.add(pkgItem);
    state.setItem(pkgItem.id, pkgItem);
  }
  item.canResolveChildren = false;
  state.markResolved(item.id);
}

/** Resolve um nó `package:` → filhos `suite:`. */
export function resolvePackageNode(
  controller: vscode.TestController,
  state: TestStateManager,
  item: vscode.TestItem,
): void {
  if (state.isResolved(item.id)) return;
  const parts = item.id.split(':'); // package:<schema>:<pkg>
  const schema = parts[1] ?? '';
  const pkg = parts.slice(2).join(':');
  const suites = (state.getSchemaSuites(schema) ?? []).filter((s) => s.packageName === pkg);
  for (const suite of suites) addSuiteItem(controller, state, item, suite);
  item.canResolveChildren = false;
  state.markResolved(item.id);
}

/** Resolve um nó `suite:` → filhos `test:`. */
export function resolveSuiteNode(
  controller: vscode.TestController,
  state: TestStateManager,
  item: vscode.TestItem,
): void {
  if (state.isResolved(item.id)) return;
  const suite = state.getSuiteFile(item.id);
  if (suite) fillSuiteTests(controller, state, item, suite);
  item.canResolveChildren = false;
  state.markResolved(item.id);
}

/** Força a resolução de toda a árvore (schema → package → suite). */
async function resolveAllTree(
  controller: vscode.TestController,
  state: TestStateManager,
  deps: TreeResolveDeps,
): Promise<void> {
  const roots: vscode.TestItem[] = [];
  controller.items.forEach((i) => {
    roots.push(i);
  });
  const suites: vscode.TestItem[] = [];
  for (const root of roots) {
    if (root.id.startsWith('schema:')) {
      await resolveSchemaNode(controller, state, root, deps);
    }
    const packages: vscode.TestItem[] = [];
    for (const [, c] of root.children) {
      if (c.id.startsWith('package:')) packages.push(c);
      else if (c.id.startsWith('suite:')) suites.push(c);
    }
    for (const pkg of packages) {
      resolvePackageNode(controller, state, pkg);
      for (const [, c] of pkg.children) {
        if (c.id.startsWith('suite:')) suites.push(c);
      }
    }
  }
  for (const suite of suites) resolveSuiteNode(controller, state, suite);
}

/**
 * Coleta todos os itens conhecidos. Resolve sob demanda os níveis ainda não
 * resolvidos (PRD-75 RF4) e devolve as suites (mesma carga de `cachedItems`).
 */
export async function collectAllItems(
  controller: vscode.TestController,
  state: TestStateManager,
  deps: TreeResolveDeps = defaultResolveDeps,
): Promise<vscode.TestItem[]> {
  await resolveAllTree(controller, state, deps);
  return state.cachedItems;
}

/**
 * Resolve a subárvore de um item não resolvido (schema → package → suite),
 * sob demanda. Usado antes de montar um `TestRunRequest` para um nó que ainda
 * não foi expandido (PRD-75 RF4).
 */
export async function resolveSubtree(
  controller: vscode.TestController,
  state: TestStateManager,
  item: vscode.TestItem,
  deps: TreeResolveDeps = defaultResolveDeps,
): Promise<void> {
  if (item.id.startsWith('schema:')) {
    await resolveSchemaNode(controller, state, item, deps);
  } else if (item.id.startsWith('package:')) {
    resolvePackageNode(controller, state, item);
  } else if (item.id.startsWith('suite:')) {
    resolveSuiteNode(controller, state, item);
  } else {
    return;
  }
  const children: vscode.TestItem[] = [];
  for (const [, c] of item.children) children.push(c);
  for (const child of children) await resolveSubtree(controller, state, child, deps);
}

export async function mergeDbSuites(
  suites: SuiteFile[],
  folders: readonly vscode.WorkspaceFolder[],
  schemaPattern: string,
  deps: MergeDbDeps = defaultMergeDbDeps,
): Promise<void> {
  const cfg = readConfig();
  if (cfg.discoverySource === 'file') return;

  const connStr = deps.resolveConnection();
  if (!connStr) return;

  const schemas = new Set<string>();
  for (const suite of suites) {
    const schema = deps.extractSchemaFromPath(
      suite.uri.fsPath,
      suite.folder.uri.fsPath,
      schemaPattern,
    );
    if (schema) schemas.add(schema);
  }
  for (const schema of await deps.discoverSchemasFromFolders(folders, schemaPattern)) {
    schemas.add(schema);
  }

  const dbSuites: SuiteFile[] = [];
  for (const schema of schemas) {
    dbSuites.push(...(await deps.discoverDbSuites(connStr, schema, folders)));
  }
  // Fusão DB-first (PRD-74 RF3): arquivo prevalece em uri/range; banco em
  // descrição/tags. `mergeSuiteLists` devolve a união por package.
  const merged = mergeSuiteLists(suites, dbSuites);
  suites.length = 0;
  suites.push(...merged);
}

/** Dependências de `mergeDbSuites` (injetáveis nos testes). */
export interface MergeDbDeps {
  resolveConnection(): string | undefined;
  extractSchemaFromPath(
    filePath: string,
    workspaceFsPath: string,
    schemaPattern: string,
  ): string | undefined;
  discoverSchemasFromFolders(
    folders: readonly vscode.WorkspaceFolder[],
    schemaPattern: string,
  ): Promise<string[]>;
  discoverDbSuites(
    connStr: string,
    schema: string,
    folders: readonly vscode.WorkspaceFolder[],
  ): Promise<SuiteFile[]>;
}

const defaultMergeDbDeps: MergeDbDeps = {
  resolveConnection: resolveConnectionNoPrompt,
  extractSchemaFromPath,
  discoverSchemasFromFolders,
  discoverDbSuites,
};

/**
 * Cria o refresher da árvore de testes com coalescência de chamadas
 * concorrentes (uma execução por vez; reexecuta se solicitado durante).
 * No modo `schema` materializa só os schemas; o restante é lazy (PRD-75).
 */
export function createRefresher(
  controller: vscode.TestController,
  state: TestStateManager,
): () => Promise<void> {
  let refreshPromise: Promise<void> | undefined;
  let needsRefresh = false;

  const doRefresh = async (): Promise<void> => {
    const folders = vscode.workspace.workspaceFolders;
    const cfg = readConfig();
    const suites = await discoverWorkspace(cfg.includePatterns, folders ?? undefined);
    controller.items.replace([]);
    state.cachedItems = [];
    state.clearSuiteMap();
    state.clearItemMap();
    state.clearResolved();
    state.clearSchemaSuites();
    state.clearSuiteFiles();
    state.setDiscoveredFiles([]);
    clearDbSourceCache();

    if (cfg.organization === 'schema' && folders?.length) {
      const extra = await discoverSchemasFromFolders(folders, cfg.organizationSchemaPattern);
      buildSchemaTree(controller, state, suites, cfg.organizationSchemaPattern, extra);
    } else {
      buildFileTree(controller, state, suites);
    }
  };

  const refresh = async (): Promise<void> => {
    if (refreshPromise) {
      needsRefresh = true;
      await refreshPromise;
      if (needsRefresh) {
        needsRefresh = false;
        return refresh();
      }
      return;
    }

    refreshPromise = doRefresh();
    try {
      await refreshPromise;
    } finally {
      refreshPromise = undefined;
    }
  };

  return refresh;
}
