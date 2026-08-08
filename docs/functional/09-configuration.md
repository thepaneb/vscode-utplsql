# 09 — Configuration

Sistema de configuração da extensão: settings, conexão, ambiente.

## `UtConfig` (src/config.ts)

```typescript
interface UtConfig {
  // Conexão e CLI
  cliPath: string;                    // default: "utplsql"
  invocation: string;                 // default: "launcher"
  javaPath: string;                   // default: "java"
  javaArgs: string[];                 // default: ["-Xmx256m"]
  cliHome: string;                    // default: ""
  runnerMode: 'auto' | 'cli' | 'oracle'; // default: "auto"

  // Cobertura
  sourcePath: string;                 // default: "install"
  coverageOwner: string;              // default: ""
  coverageSourceArgs: string[];       // regex + type_mapping

  // Descoberta
  includePatterns: string[];          // default: ["**/*.pks"]

  // Execução
  timeoutMinutes: number;             // default: 60
  dbmsOutput: boolean;                // default: false
  quiet: boolean;                     // default: false
  failureExitCode: number;            // default: 1
  extraRunArgs: string[];             // default: []

  // Reporters
  additionalReporters: string[];      // default: []

  // UX
  codeLensEnabled: boolean;           // default: true
  statusBarEnabled: boolean;          // default: true
  decorationsEnabled: boolean;        // default: true

  // Diagnósticos
  compilationDiagnosticsEnabled: boolean;  // default: true
  setupDiagnosticsEnabled: boolean;        // default: true

  // Organização
  organization: 'file' | 'schema';    // default: "file"
  organizationSchemaPattern: string;  // default: "db/{schema}/**"
}
```

## `readConfig()`

```typescript
function readConfig(): UtConfig
```

Lê `vscode.workspace.getConfiguration('utplsql')`. Todos os valores têm defaults
— a extensão funciona sem nenhuma configuração.

## `resolveConnection()`

```typescript
async function resolveConnection(): Promise<string | undefined>
```

Ordem de resolução:
1. Setting `utplsql.connection` (settings.json do usuário/workspace)
2. Variável de ambiente `UTPLSQL_CONN`
3. Cache da sessão (`sessionConnection` — se já digitou antes)
4. Prompt `vscode.window.showInputBox` (password: true, ignoreFocusOut: true)

Ao resolver com sucesso, seta `utplsql:connected` context key.
`clearSessionConnection()` limpa o cache.

### Segurança

- A string de conexão **nunca é logada** — `safeArgs` substitui por `***`
- Recomendação: usar env var `UTPLSQL_CONN`, não settings.json
- Prompt da sessão usa `password: true` (mascarado)

### Formatos aceitos

- **EZ Connect**: `user/pass@//host:port/service`
- **TNS**: `user/pass@tns_alias` (requer `TNS_ADMIN`)
- **Wallet**: `user/pass@tcps://host:port/service?wallet_location=/path`

## `InvocationConfig` (src/invocation.ts)

```typescript
interface InvocationConfig {
  invocation: string;
  cliPath: string;
  javaPath: string;
  javaArgs: string[];
  cliHome: string;
}
```

Subconjunto de `UtConfig` usado para decidir como invocar o CLI. Passado para
`buildInvocation`, `getCliInfo`, `listReporters`.

## `TestStateManager` (src/state.ts)

Estado em memória durante a sessão:

```typescript
class TestStateManager {
  // Metadados dos TestItems
  setMeta(item, meta): void;
  getMeta(item): ItemMeta | undefined;

  // Cobertura
  setCoverage(uri, details): void;
  getCoverage(uri): FileCoverageDetail[];
  clearCoverage(): void;

  // Resultados da última execução
  setLastResults(results): void;
  getLastResults(): Map<string, TestLineResult>;
  clearLastResults(): void;
  setLastFailedItems(items): void;
  getLastFailedItems(): TestItem[];

  // Última execução (para Rerun Last)
  setLastRun(state): void;
  getLastRun(): LastRunState | undefined;

  // Reporter volátil
  setExtraReporter(name): void;
  consumeExtraReporter(): string | undefined;

  // Suite lookup (para schema mode)
  setSuiteItem(id, item): void;
  getSuiteItem(id): TestItem | undefined;
  clearSuiteMap(): void;

  // Cache
  cachedItems: TestItem[];
  runProfile?: TestRunProfile;
  coverageProfile?: TestRunProfile;
}
```

## `ItemMeta` (src/types.ts)

```typescript
type ItemMeta =
  | { kind: 'suite'; packageName: string; uri: Uri; folder: WorkspaceFolder }
  | { kind: 'test'; packageName: string; procName: string; description: string; uri: Uri; folder: WorkspaceFolder };
```

Armazenado via `WeakMap<TestItem, ItemMeta>` no `TestStateManager`.

## Variáveis de ambiente

| Variável | Uso |
|---|---|
| `UTPLSQL_CONN` | String de conexão Oracle |
| `UTPLSQL_CLI_PATH` | Caminho do CLI (testes de integração) |
| `UTPLSQL_CLI_HOME` | Raiz do CLI (testes de integração, modo java) |

## Hierarquia de settings

O VSCode aplica settings nesta ordem (última sobrescreve):
1. Default da extensão
2. User settings (`%APPDATA%/Code/User/settings.json`)
3. Workspace settings (`.vscode/settings.json`)
4. Workspace Folder settings (multi-root)

Recomendação: `cliPath`, `sourcePath`, `coverageSourceArgs` no workspace.
`connection` via env var (nunca em settings versionadas).
