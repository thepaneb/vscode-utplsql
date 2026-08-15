# 01 — Test Discovery

Descoberta de suites e testes utPLSQL nos arquivos `.pks` do workspace.

## Fluxo

```
workspace folders
    │
    ├─► vscode.workspace.findFiles(includePatterns)  →  lista de URIs (.pks)
    │
    ├─► parseSuite(uri, text)
    │       │
    │       ├─► suiteParser.ts: parseSuiteText(text)
    │       │       ├─► regex %suite → packageName, suiteDescription, suiteLine
    │       │       ├─► regex %test → procName, description, line
    │       │       └─► annotations: %disabled, %throws, %tags, %displayname,
    │       │           lifecycle (%beforeall/%beforeeach/%aftereach/%afterall)
    │       │
    │       └─► retorna ParsedSuite | null (sem %suite)
    │
    └─► discoverWorkspace(patterns, folders) → SuiteFile[]
            │
            ├─► filtra suites com disabled e testes com disabled
            └─► resolveFolder(uri, folders) → WorkspaceFolder (prefixo mais longo)
```

## Arquivos

| Arquivo | Tipo | Descrição |
|---|---|---|
| `src/suiteParser.ts` | Puro | `parseSuiteText(text)` — extrai `packageName`, `suiteDescription`, `tests[]` via regex |
| `src/discovery.ts` | vscode | `discoverWorkspace()`, `parseSuite()`, `extractSchemaFromPath()`, `SuiteFile` |
| `src/matching.ts` | Puro | `filterSuitesByUri()`, `filterSuitesByFolder()` — filtragem por URI/pasta |
| `src/codelens.ts` | Híbrido | `parseCodeLensItems()` puro + `UtplsqlCodeLensProvider` vscode |

## Interface `SuiteFile`

```typescript
interface SuiteFile {
  uri: vscode.Uri;
  packageName: string;       // nome do package Oracle
  suiteDescription: string;  // descrição do %suite
  tests: TestProc[];         // lista de procedimentos de teste
  folder: vscode.WorkspaceFolder;
  suiteLine: number;         // linha do %suite (para decorações)
  disabled?: boolean;        // %disabled no nível da suite (PRD-42)
  hasBeforeAll?: boolean;    // lifecycle hooks (PRD-42)
  hasAfterAll?: boolean;
  hasBeforeEach?: boolean;
  hasAfterEach?: boolean;
}

interface TestProc {
  procName: string;          // nome do procedure
  description: string;       // descrição do %test
  line: number;              // linha do %test
  disabled?: boolean;        // %disabled (PRD-42)
  expectedError?: number;    // %throws(-NNNNN) → valor absoluto (PRD-42)
  tags?: string[];           // %tags(a,b,c) → array trimado (PRD-42)
  displayName?: string;      // %displayname(nome) — sobrescreve description (PRD-42)
}
```

## `parseSuiteText` — parsing

```typescript
// Regex para %suite: captura nome opcional (descrição) e posição
// %suite(Descrição) ou %suite
const suiteRegex = /--\s*%suite\s*(?:\(\s*(.+?)\s*\))?/i;

// Regex para %test: captura nome opcional (descrição)
// %test(Descrição)
const testRegex = /--\s*%test\s*(?:\(\s*(.+?)\s*\))?/i;

// Regex para procedure: captura nome e linha
// PROCEDURE nome_do_proc
const procRegex = /^\s*PROCEDURE\s+(\w+)/mi;
```

O parser percorre o texto linha a linha:
1. Encontra `%suite` → armazena descrição + linha
2. Encontra `%test` → armazena descrição + linha, associa ao próximo `PROCEDURE`
3. Se encontrar novo `%suite`, finaliza a suíte anterior
4. Linha em branco entre `%suite` e primeiro `%test`/procedure é necessária

## Annotations estendidas (PRD-42)

| Annotation | Alvo | Campo | Comportamento |
|---|---|---|---|
| `-- %disabled` | suite / teste | `disabled` | Suites e testes desabilitados **não aparecem** no Test Explorer (`discoverWorkspace` filtra) |
| `-- %throws(-20001)` | teste | `expectedError` | Código de erro esperado, **valor absoluto** (o `-` do utPLSQL é convenção de "espera lançar") |
| `-- %tags(fast, critical)` | teste | `tags[]` | Array trimado, split por `,` (filtro por tag é PRD futura) |
| `-- %displayname(Nome)` | teste | `displayName` | Sobrescreve a descrição exibida na árvore (`displayName ?? description`) |
| `-- %beforeall` / `%beforeeach` / `%aftereach` / `%afterall` | suite | booleanos | Metadados de lifecycle (indicam setup/teardown) |

Regras de escopo (blocos de annotation):
- **Header da suite** (entre `%suite` e o primeiro `%test`) → annotations aplicam à **suite** (`%disabled` desabilita a suite inteira)
- **Entre `%test` e a procedure** (ou entre a procedure anterior e o próximo `%test`) → aplicam ao **teste**
- Case-insensitive (`%DISABLED` == `%disabled`)

## `discoverWorkspace`

```typescript
async function discoverWorkspace(
  patterns: string[],       // ex: ['**/*.pks']
  folders?: WorkspaceFolder[],
): Promise<SuiteFile[]>
```

1. Itera cada pattern, chama `vscode.workspace.findFiles(pattern, '**/node_modules/**')`
2. Deduplica URIs via `Set`
3. Lê cada arquivo com `vscode.workspace.fs.readFile(uri)`
4. Chama `parseSuite()` — se retornar `null` (sem `%suite`) ou `tests.length === 0`, ignora
5. Filtra testes com `disabled: true`; se sobrarem 0 testes (ou `suite.disabled`), ignora a suite
6. Resolve `WorkspaceFolder` via `resolveFolder()` (prefixo mais longo)
7. Arquivos ilegíveis são ignorados (catch silencioso)

## `extractSchemaFromPath`

Usado exclusivamente no modo `organization: schema` (veja [06 — Tree Organization](06-tree-organization.md)):

```typescript
function extractSchemaFromPath(
  filePath: string,
  workspaceFsPath: string,
  schemaPattern: string,    // ex: "db/{schema}/**"
): string | undefined
```

- Converte `{schema}` para grupo de captura `([^/]+)`
- Converte `**` para `.*`, `*` para `[^/]*`
- Aplica regex ao caminho relativo (normalizado com `/`)
- Retorna schema em maiúsculas ou `undefined`

## `parseCodeLensItems`

```typescript
function parseCodeLensItems(text: string): CodeLensItem[]
```

Mesmo parser acima, mas exposto como API pública para:
- **CodeLens**: gerar botões Run/Run with Coverage
- **Decorations**: mapear resultados para linhas `%suite` (PRD-26)
- **Run at Cursor**: encontrar anotação mais próxima acima do cursor

> ⚠️ Mudanças em `parseCodeLensItems` afetam 3 consumidores.

## `filterSuitesByUri` / `filterSuitesByFolder`

```typescript
function filterSuitesByUri(metas: ItemMeta[], uriFsPath: string): ItemMeta[]
function filterSuitesByFolder(metas: ItemMeta[], folderFsPath: string): ItemMeta[]
```

Filtram `ItemMeta[]` (obtidos via `state.getMeta()`) por arquivo ou pasta.
Usados nos comandos `runFile` / `runFolder`.

## Setting relevante

| Setting | Default | Descrição |
|---|---|---|
| `utplsql.includePatterns` | `["**/*.pks"]` | Globs para descobrir specs de teste |
