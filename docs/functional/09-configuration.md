# 09 — Configuration

Sistema de configuração da extensão: settings, conexão, ambiente.

## `UtConfig` (src/config.ts)

```typescript
interface UtConfig {
  // Pool do Oracle runner (PRD-38)
  oraclePoolMin: number;              // default: 2
  oraclePoolMax: number;              // default: 10
  oraclePoolIncrement: number;        // default: 1
  oraclePoolPingInterval: number;     // default: 60 (health check de conexões ociosas)

  // Cobertura
  sourcePath: string;                 // default: "install"
  coverageOwner: string;              // default: ""
  sqlCoverageEnabled: boolean;        // default: false (PRD-12)

  // Debugger (PRD-33)
  debuggerEnabled: boolean;           // default: true
  debuggerStopOnException: boolean;   // default: true
  debuggerTimeoutSeconds: number;     // default: 300

  // i18n (PRD-49)
  language:
    | 'auto'
    | 'pt-br'
    | 'en'
    | 'es'
    | 'zh-cn'
    | 'zh-tw'
    | 'ja'
    | 'de'
    | 'fr'
    | 'it'
    | 'ko'
    | 'ru'
    | 'tr'
    | 'pl'
    | 'cs'
    | 'hu';                           // default: "auto"

  // Descoberta
  includePatterns: string[];          // default: ["**/*.pks"]

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
1. Perfil ativo (`utplsql.activeProfile` → `profile.connection`)
2. Setting `utplsql.connection` (settings.json do usuário/workspace)
3. Variável de ambiente `UTPLSQL_CONN`
4. Cache da sessão (`sessionConnection` — se já digitou antes)
5. Prompt `vscode.window.showInputBox` (password: true, ignoreFocusOut: true)

Ao resolver com sucesso, seta `utplsql:connected` context key.
`clearSessionConnection()` limpa o cache.
`resolveConnectionNoPrompt()` percorre os passos 1–4 sem exibir prompt
(retorna `undefined` se nada estiver configurado).

> `readConfig()` aplica `mergeProfileConfig(global, getActiveProfile())` — o
> perfil ativo sobrescreve campos como `sourcePath` e `coverageOwner`.

### Segurança

- A string de conexão **nunca é logada** — `safeArgs` substitui por `***`
- Recomendação: usar env var `UTPLSQL_CONN`, não settings.json
- Prompt da sessão usa `password: true` (mascarado)

### Formatos aceitos

- **EZ Connect**: `user/pass@//host:port/service`
- **TNS**: `user/pass@tns_alias` (requer `TNS_ADMIN`)
- **Wallet**: `user/pass@tcps://host:port/service?wallet_location=/path`

## Connection Profiles (PRD-34)

`src/connectionProfiles.ts` (vscode-dependente). Perfis reutilizáveis de
conexão que encapsulam a string de conexão **e** a configuração associada
(sourcePath, coverageOwner, etc.).

```typescript
interface ConnectionProfile {
  id: string;
  name: string;
  connection: string;
  sourcePath?: string;
  coverageOwner?: string;
  includePatterns?: string[];
  isDefault?: boolean;
  lastUsed?: string;
}
```

### Settings

| Setting | Descrição |
|---|---|
| `utplsql.profiles` | Array de `ConnectionProfile` (global) |
| `utplsql.activeProfile` | `id` do perfil ativo (vazio = nenhum) |

### API

```typescript
maskConnection(conn: string): string;                     // "scott/tiger@host" → "scott@host"
selectProfile(profiles): Promise<ConnectionProfile | undefined>;  // QuickPick
importFromSqlDeveloper(): Promise<ConnectionProfile[]>;   // parse de connections.xml
getActiveProfile(): ConnectionProfile | undefined;
saveProfiles(profiles): Promise<void>;
setActiveProfile(id: string | undefined): Promise<void>;
mergeProfileConfig(global: UtConfig, profile?): UtConfig;
```

- `importFromSqlDeveloper` localiza `connections.xml` do SQL Developer sob
  `~/.sqldeveloper` e `%APPDATA%/SQL Developer` (subpastas `system*`)
- `mergeProfileConfig` aplica os campos do perfil sobre a config global; sem
  perfil → global intacto
- `resolveConnection()` checa o perfil ativo **antes** do setting `utplsql.connection`

## i18n (PRD-49)

Motor de tradução das mensagens de runtime. `src/i18n.ts` (puro) + catálogos
em `src/i18nLocales.ts` para 24 idiomas (15 nativos do VSCode + 9 da comunidade).

```typescript
function resolveLocale(setting: string, vscodeLanguage: string): ExtensionLocale
function t(locale: ExtensionLocale, key: string, params?): string
```

- `resolveLocale`: se a setting é um idioma válido, usa; senão infere do
  idioma do editor (ex.: `pt` → `pt-br`, `zh-tw`/`zh-hk` → `zh-tw`); fallback `en`
- `t`: traduz a chave; chave ausente → pt-BR → a própria chave. Nunca lança.
- `{param}` interpolados por `t(locale, key, { param: valor })`

| Setting | Valores | Default |
|---|---|---|
| `utplsql.language` | `auto` \| `pt-br` \| `en` \| `en-gb` \| `es` \| `zh-cn` \| `zh-tw` \| `ja` \| `de` \| `fr` \| `it` \| `ko` \| `ru` \| `tr` \| `pl` \| `cs` \| `hu` \| `bg` \| `el` \| `id` \| `ro` \| `sr` \| `th` \| `uk` \| `vi` | `auto` |

`package.nls*.json` traduzem os títulos de comandos; o motor i18n cobre as
mensagens de runtime (prompts, outputs, diagnósticos).

![Arquitetura de internacionalização (i18n)](../wiki/images/diagram-i18n.png)

## `TestStateManager` (src/state.ts)

Estado em memória durante a sessão:

```typescript
class TestStateManager {
  // Metadados dos TestItems
  setMeta(item, meta): void;
  getMeta(item): ItemMeta | undefined;

  // Cobertura
  setCoverage(uriStr, details): void;
  getCoverage(uriStr): FileCoverageDetail[];   // chave = uri.toString()
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

## Hierarquia de settings

O VSCode aplica settings nesta ordem (última sobrescreve):
1. Default da extensão
2. User settings (`%APPDATA%/Code/User/settings.json`)
3. Workspace settings (`.vscode/settings.json`)
4. Workspace Folder settings (multi-root)

Recomendação: `sourcePath` no workspace. `connection` via env var (nunca em
settings versionadas).
