/**
 * Classificação das mudanças de configuração (PRD-138 RF4).
 * Módulo PURO (sem `vscode`): o caller fornece `affectsConfiguration`.
 */

export interface ConfigChangeActions {
  invalidateConfigCache: boolean;
  rebuildCodeLens: boolean;
  rebuildWatcher: boolean;
  refreshTree: boolean;
  invalidatePool: boolean;
  resetSetupValidation: boolean;
  recomputeTrace: boolean;
}

const LANGUAGE_KEYS = ['utplsql.discovery.languageIds', 'files.associations'];
const TREE_KEYS = [
  'utplsql.organization',
  'utplsql.organization.schemaPattern',
  'utplsql.includePatterns',
  'utplsql.showTagsInTree',
  'utplsql.showTestDuration',
  'utplsql.discovery.source',
  ...LANGUAGE_KEYS,
];

export function classifyConfigChange(affects: (section: string) => boolean): ConfigChangeActions {
  const language = LANGUAGE_KEYS.some((key) => affects(key));
  const tree = TREE_KEYS.some((key) => affects(key));
  return {
    invalidateConfigCache:
      affects('utplsql') || affects('sqldeveloper.connections.tnsConfiguration.path'),
    rebuildCodeLens: language,
    rebuildWatcher: language,
    refreshTree: tree,
    invalidatePool: affects('utplsql'),
    resetSetupValidation: affects('utplsql'),
    recomputeTrace: affects('utplsql'),
  };
}
