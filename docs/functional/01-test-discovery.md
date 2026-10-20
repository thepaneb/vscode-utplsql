<!-- GENERATED FROM docs/brain/10-Projeto/Funcional/01-test-discovery.md — DO NOT EDIT -->
# 01 — Test Discovery

Descoberta de suites e testes utPLSQL nos arquivos PL/SQL do workspace e,
no modo `schema`, complementada por descoberta direto do banco (PRD-43).

Desde a PRD-109, os patterns efetivos são a união de `includePatterns` com os
globs derivados de `utplsql.discovery.languageIds` (default `plsql`, `sql`,
`oracle-sql`) — extensões contribuídas por qualquer extensão instalada — e das
chaves de `files.associations` que apontam para um desses IDs. `.pks` continua
sempre aceito.

## Fluxo

```
workspace folders
    │
    ├─► vscode.workspace.findFiles(patterns efetivos)  →  lista de URIs PL/SQL
    │
    ├─► parseSuite(uri, text)
    │       │
    │       ├─► suiteParser.ts: parseSuiteText(text)
    │       │       ├─► RE_PACKAGE (create package) → packageName
    │       │       ├─► regex %suite → suiteDescription, suiteLine
    │       │       ├─► regex %test → procName, description, line
    │       │       └─► annotations: %disabled, %throws, %tags, %displayname,
    │       │           lifecycle (%beforeall/%beforeeach/%aftereach/%afterall)
    │       │
    │       └─► retorna ParsedSuite | null (sem %suite ou sem CREATE PACKAGE)
    │
    ├─► discoverWorkspace(patterns, folders) → SuiteFile[]
    │       │
    │       ├─► filtra suites com disabled e testes com disabled
    │       └─► resolveFolder(uri, folders) → WorkspaceFolder (prefixo mais longo)
    │
    └─► (modo schema + Oracle) discoverSchemaFromDb() → SuiteFile[] (PRD-43)
            │
            ├─► ALL_OBJECTS → packages VALID (sem prefixo UT_)
            ├─► ALL_SOURCE → texto da spec (prefixo sintético CREATE OR REPLACE)
            └─► merge: filesystem tem prioridade sobre o banco
```

## Arquivos

| Arquivo | Tipo | Descrição |
|---|---|---|
| `src/suiteParser.ts` | Puro | `parseSuiteText(text)` — extrai `packageName` (via regex de `create package`), `suiteDescription`, `tests[]` |
| `src/discovery.ts` | vscode | `discoverWorkspace()`, `parseSuite()`, `extractSchemaFromPath()`, `discoverSchemaFromDb()`, `discoverSchemaFromConn()`, `discoverSchemasFromFolders()`, `SuiteFile` |
| `src/languageIdentity.ts` | vscode | `buildLanguageGlobs()`, `matchesLanguageIdentity()`, `buildLanguageSelector()`, `buildWatcherGlob()` — `discovery.languageIds` + `files.associations` (PRD-109) |
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
  dbSchema?: string;         // schema Oracle de suites descobertas via DB (PRD-43)
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
// Package: exige a declaração create [or replace] package
// (no ALL_SOURCE do banco o texto começa em "PACKAGE …" — a descoberta via DB
//  prefixa "CREATE OR REPLACE " sinteticamente)
const RE_PACKAGE = /create\s+(?:or\s+replace\s+)?package\s+(?:body\s+)?(?:"?(\w+)"?\.)?"?(\w+)"?/i;

// Regex para %suite: captura nome opcional (descrição)
// %suite(Descrição) ou %suite
const RE_SUITE = /--\s*%suite\s*(?:\(([^)]*)\))?/i;

// Regex para %test: captura nome opcional (descrição)
const RE_TEST = /--\s*%test\s*(?:\(([^)]*)\))?/i;

// Regex para procedure: captura nome (case-insensitive, sem âncora de linha)
const RE_PROC = /\bprocedure\s+"?(\w+)"?/i;
```

O parser percorre o texto linha a linha:
1. Exige `%suite` no texto e a declaração `create … package` — sem ambos, retorna `null`
2. Encontra `%test` → associa as annotations seguintes ao próximo `PROCEDURE`
3. Um arquivo produz **uma única** `ParsedSuite` (múltiplos `%suite` no mesmo
   arquivo não são divididos — o primeiro define `suiteLine`)
4. Não há requisito de linha em branco — o parser é dirigido por tokens

## Annotations estendidas (PRD-42)

| Annotation | Alvo | Campo | Comportamento |
|---|---|---|---|
| `-- %disabled` | suite / teste | `disabled` | Suites e testes desabilitados **não aparecem** no Test Explorer (`discoverWorkspace` filtra) |
| `-- %throws(-20001)` | teste | `expectedError` | Código de erro esperado, **valor absoluto** (o `-` do utPLSQL é convenção de "espera lançar") |
| `-- %tags(fast, critical)` | teste | `tags[]` | Array trimado, split por `,`; filtro de execução via setting `utplsql.tags` (UI por tag é PRD-51) |
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
| `utplsql.includePatterns` | `["**/*.pks"]` | Globs adicionais para descobrir specs de teste (somados a `discovery.languageIds`/`files.associations`) |
| `utplsql.discovery.languageIds` | `["plsql", "sql", "oracle-sql"]` | Language IDs tratados como PL/SQL; extensões vêm das extensões instaladas + `files.associations` (PRD-109) |
| `utplsql.discovery.source` | `auto` | Fonte da árvore no modo `schema`: `auto` (API `get_suites_info` + fallback `ALL_SOURCE`), `database` (exige a API) ou `file` (desliga a descoberta via banco) |

## Descoberta DB-first (PRD-74)

No modo `schema`, `mergeDbSuites` consulta `ut_runner.get_suites_info` (utPLSQL
≥ 3.1.3) e funde com a descoberta por arquivo: o arquivo prevalece em URI/linha,
o banco em descrição/tags. Quando a API não está disponível, cai para
`ALL_SOURCE` (PRD-43). `discoverDbSuites` faz o gate de versão.

## Reconstruir o cache de anotações (PRD-77)

A API `get_suites_info` lê o cache de anotações mantido pela DDL trigger do
utPLSQL. Se o cache estiver desatualizado, o comando **`utPLSQL: Rebuild
Annotation Cache`** (`utplsql.rebuildAnnotations`) chama
`ut_runner.rebuild_annotation_cache(<owner>)` e atualiza a árvore. Requer
conexão resolvida (não abre prompt); sem conexão, avisa.

## Geração de suíte de teste (PRD-59 + PRD-100)

O comando **`utPLSQL: Generate test suite`** (`utplsql.generateTestSuite`) e a
**Code Action** equivalente (em `.pks`/`.pkb` de produção, nunca em `ut_*`)
geram `ut_<pacote>.pks` ao lado do arquivo — ou na primeira pasta do workspace
quando a origem é um objeto do banco (prompt `SCHEMA.OBJECT`).

- Uma rotina por `%test`, extraída por `parsePlsqlDeclarations`
  (`src/plsqlDeclarations.ts`, puro); sem rotinas, escreve o esqueleto
  (`%suite` + um `%test` de exemplo).
- Opções: `utplsql.generate.testPackagePrefix` (default `ut_`),
  `…testPackageSuffix`, `…numberOfTestsPerUnit` (teto 50) e
  `…generateComments` (emite `-- TODO`).
- **Nunca sobrescreve** um arquivo existente sem confirmação.
- Implementação em `src/scaffold.ts` + `src/commands/scaffold.ts`.
