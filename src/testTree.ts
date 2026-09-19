import * as vscode from 'vscode';
import { getExtensionLocale, readConfig, resolveConnectionNoPrompt } from './config';
import { clearDbSourceCache } from './dbSourceProvider';
import {
  discoverSchemaFromDb,
  discoverSchemasFromFolders,
  discoverWorkspace,
  extractSchemaFromPath,
  type SuiteFile,
} from './discovery';
import { t } from './i18n';
import type { TestStateManager } from './state';

/**
 * Constrói a árvore do Test Explorer quando `utplsql.organization` = `file`.
 * Exportado para testes (RF2).
 */
export function buildFileTree(
  controller: vscode.TestController,
  state: TestStateManager,
  suites: SuiteFile[],
): void {
  for (const suite of suites) {
    const suiteItem = controller.createTestItem(
      `suite:${suite.packageName.toLowerCase()}`,
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
    controller.items.add(suiteItem);
    state.cachedItems.push(suiteItem);
    state.setSuiteItem(`suite:${suite.packageName.toLowerCase()}`, suiteItem);
    state.setItem(suiteItem.id, suiteItem);
  }
}

/**
 * Constrói a árvore Schema > Package > Suite > Test quando
 * `utplsql.organization` = `schema`. Exportado para testes (RF2).
 */
export function buildSchemaTree(
  controller: vscode.TestController,
  state: TestStateManager,
  suites: SuiteFile[],
  schemaPattern: string,
): void {
  const locale = getExtensionLocale();
  const bySchema = new Map<string, SuiteFile[]>();

  for (const suite of suites) {
    const schema =
      suite.dbSchema ??
      extractSchemaFromPath(suite.uri.fsPath, suite.folder.uri.fsPath, schemaPattern);
    const key = schema ?? 'UNKNOWN';
    if (!bySchema.has(key)) bySchema.set(key, []);
    bySchema.get(key)?.push(suite);
  }

  const sortedSchemas = [...bySchema.keys()].sort((a, b) => {
    if (a === 'UNKNOWN') return 1;
    if (b === 'UNKNOWN') return -1;
    return a.localeCompare(b);
  });

  for (const schema of sortedSchemas) {
    const schemaSuites = bySchema.get(schema);
    if (!schemaSuites) continue;
    const firstSuite = schemaSuites[0];
    const schemaItem = controller.createTestItem(
      `schema:${schema}`,
      t(locale, 'testTree.schemaNode', { schema }),
      firstSuite.folder.uri,
    );

    const byPackage = new Map<string, SuiteFile[]>();
    for (const suite of schemaSuites) {
      const pkg = suite.packageName;
      if (!byPackage.has(pkg)) byPackage.set(pkg, []);
      byPackage.get(pkg)?.push(suite);
    }

    for (const [pkg, pkgSuites] of byPackage) {
      const pkgItem = controller.createTestItem(
        `package:${schema}:${pkg}`,
        t(locale, 'testTree.packageNode', { package: pkg }),
        pkgSuites[0].uri,
      );

      for (const suite of pkgSuites) {
        const suiteItem = controller.createTestItem(
          `suite:${suite.packageName.toLowerCase()}`,
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
        pkgItem.children.add(suiteItem);
        state.cachedItems.push(suiteItem);
        state.setSuiteItem(`suite:${suite.packageName.toLowerCase()}`, suiteItem);
        state.setItem(suiteItem.id, suiteItem);
      }
      schemaItem.children.add(pkgItem);
      state.setItem(pkgItem.id, pkgItem);
    }
    controller.items.add(schemaItem);
    state.setItem(schemaItem.id, schemaItem);
  }
}

/** Coleta todos os itens conhecidos (até 3 níveis: schema > package > suite). */
export function collectAllItems(
  controller: vscode.TestController,
  state: TestStateManager,
): vscode.TestItem[] {
  if (state.cachedItems.length) return state.cachedItems;
  controller.items.forEach((i) => {
    state.cachedItems.push(i);
    for (const [, c] of i.children) {
      state.cachedItems.push(c);
      for (const [, gc] of c.children) {
        state.cachedItems.push(gc);
      }
    }
  });
  return state.cachedItems;
}

export async function mergeDbSuites(
  suites: SuiteFile[],
  folders: readonly vscode.WorkspaceFolder[],
  schemaPattern: string,
  deps: MergeDbDeps = defaultMergeDbDeps,
): Promise<void> {
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

  for (const schema of schemas) {
    const dbSuites = await deps.discoverSchemaFromDb(connStr, schema, folders);
    for (const dbSuite of dbSuites) {
      const exists = suites.some(
        (fs) => fs.packageName.toLowerCase() === dbSuite.packageName.toLowerCase(),
      );
      if (!exists) {
        suites.push(dbSuite);
      }
    }
  }
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
  discoverSchemaFromDb(
    connStr: string,
    schema: string,
    folders: readonly vscode.WorkspaceFolder[],
  ): Promise<SuiteFile[]>;
}

const defaultMergeDbDeps: MergeDbDeps = {
  resolveConnection: resolveConnectionNoPrompt,
  extractSchemaFromPath,
  discoverSchemasFromFolders,
  discoverSchemaFromDb,
};

/**
 * Cria o refresher da árvore de testes com coalescência de chamadas
 * concorrentes (uma execução por vez; reexecuta se solicitado durante).
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
    clearDbSourceCache();

    if (cfg.organization === 'schema' && folders?.length) {
      await mergeDbSuites(suites, folders, cfg.organizationSchemaPattern);
      buildSchemaTree(controller, state, suites, cfg.organizationSchemaPattern);
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
