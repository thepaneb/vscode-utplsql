---
tipo: funcional
status: ativo
numero: 06
titulo: "06 — Tree Organization"
publicar: docs/functional/06-tree-organization.md
verificado: 2026-09-23
regras: ["BR-SCHEMA-001", "BR-SCHEMA-002", "BR-SCHEMA-003"]
relacionado: ["[[ADR-003 - Descoberta DB-first e organizacao por schema]]"]
tags: [funcional]
---
# 06 — Tree Organization

Organização da árvore de testes no Test Explorer.

## Modos

| Modo | Setting | Estrutura |
|---|---|---|
| **file** | `organization: "file"` (default) | WorkspaceFolder > arquivo > Suite > Test |
| **schema** | `organization: "schema"` | Schema > Package > Suite > Test |

## Modo `file` — comportamento padrão

```
TestController
  └── WorkspaceFolder
      └── tests/
          └── ut_my_tests.pks
              ├── Suite: My Tests (ut_my_tests)
              │   ├── test_case_1
              │   └── test_case_2
              └── Suite: Another (ut_my_tests)
                  └── test_case_3
```

### Implementação: `buildFileTree` (`src/testTree.ts`)

```typescript
function buildFileTree(controller, state, suites: SuiteFile[]): void
```

1. Para cada `suite` em `suites`:
   - Cria `suiteItem` com id `suite:${packageName.toLowerCase()}`
   - Label: `${suiteDescription}  (${packageName})`
   - Range: linha do `%suite`
   - Para cada `t` em `suite.tests`:
     - Cria `testItem` com id `test:${packageName.toLowerCase()}.${procName.toLowerCase()}`
     - Range: linha do `%test`
   - `controller.items.add(suiteItem)`
   - `state.cachedItems.push(suiteItem)`
   - `state.setSuiteItem(id, suiteItem)` (para lookup cross-mode)

## Modo `schema` — agrupamento por schema

```
TestController
  ├── Schema: APP
  │   └── Package: UT_MY_TESTS
  │       └── Suite: My Tests (ut_my_tests)
  │           ├── test_case_1
  │           └── test_case_2
  └── Schema: LOGIC
      └── Package: UT_BUSINESS
          └── Suite: Rules (ut_business)
              └── test_case_3
```

### Implementação: `buildSchemaTree` (`src/testTree.ts`)

```typescript
function buildSchemaTree(controller, state, suites: SuiteFile[], schemaPattern: string): void
```

1. **Agrupa por schema**: `suite.dbSchema ?? extractSchemaFromPath(suite.uri.fsPath, folder.fsPath, schemaPattern)`
   - Suites descobertas via DB trazem `dbSchema` preenchido (URI `utplsql-db:/` não tem fsPath local)
   - Schema extraído → chave do Map
   - Sem match → chave `"UNKNOWN"`
2. **Ordena**: schemas alfabeticamente, `UNKNOWN` por último
3. Para cada schema:
   - Cria `schemaItem` com id `schema:${SCHEMA}`, label `Schema: ${SCHEMA}`
   - **Agrupa por package**: sub-agrupa suites pelo `packageName`
   - Para cada package:
     - Cria `pkgItem` com id `package:${schema}:${pkg}`, label `Package: ${pkg}`
     - Para cada suite: cria suite/test items (idêntico ao modo file)
     - `pkgItem.children.add(suiteItem)`
   - `schemaItem.children.add(pkgItem)`
   - `controller.items.add(schemaItem)`

## Descoberta via DB (PRD-43 / DB-first PRD-74)

No modo `schema`, o `doRefresh()` chama
`mergeDbSuites()` antes de `buildSchemaTree`:

1. `resolveConnectionNoPrompt()` — sem conexão configurada, descoberta DB é pulada;
   `utplsql.discovery.source = "file"` também desliga a descoberta via banco
2. Schemas candidatos: união dos schemas das suites locais com os diretórios
   abaixo da base do `schemaPattern` (`discoverSchemasFromFolders`, ex.: `db/*`)
3. `discoverDbSuites(connStr, schema, folders)` (**DB-first, PRD-74**):
   consulta `ut_runner.get_suites_info` (utPLSQL ≥ 3.1.3) e normaliza em
   `SuiteFile` com URI virtual `utplsql-db:/SCHEMA/PKG.pks`. Se a API não estiver
   disponível (versão antiga/erro) e `discovery.source` ≠ `database`, cai para
   `ALL_OBJECTS` (packages VALID, sem prefixo `UT_`) + `ALL_SOURCE`
   (limitado a 10000 linhas), parse com `parseSuiteText` (PRD-43)
4. Fusão (`mergeSuiteLists`): união por `LOWER(packageName)` — o **arquivo
   prevalece** em `uri`/linha/`folder`; o **banco** manda em descrição/tags.
   Suíte só-DB entra com `uri` virtual e `dbSchema` definido
5. Fallback silencioso: Oracle indisponível, API/`ALL_SOURCE` inacessível ou erro
   de conexão → só a descoberta por arquivos

> **`utplsql.discovery.source`** (`auto` | `file` | `database`, PRD-74): `auto`
> usa a API e cai para `ALL_SOURCE`/arquivos; `database` exige a API; `file`
> desliga a descoberta via banco.
>
> O cache de anotações do utPLSQL (fonte da API) pode ser reconstruído com o
> comando **`utPLSQL: Rebuild Annotation Cache`** (`utplsql.rebuildAnnotations`,
> PRD-77) ⇒ `ut_runner.rebuild_annotation_cache(<owner>)` + refresh da árvore.

**Limitações das suites via DB:** sem CodeLens nem decorações inline (providers
registram `{ scheme: 'file' }`). Execução **e jump to failure** funcionam — o
`dbSourceProvider` serve o documento virtual `utplsql-db:` (fonte de `ALL_SOURCE`)
para o "Go to Error".

### IDs na árvore

| Nível | Formato do ID |
|---|---|
| Schema | `schema:APP` |
| Package | `package:APP:UT_MY_TESTS` |
| Suite | `suite:ut_my_tests` |
| Test | `test:ut_my_tests.test_case_1` |

Suite e test IDs são idênticos em ambos os modos — compatibilidade com
`applyResults`, `filterSuitesByUri`, etc.

## `extractSchemaFromPath` (src/discovery.ts)

```typescript
function extractSchemaFromPath(
  filePath: string,
  workspaceFsPath: string,
  schemaPattern: string,    // ex: "db/{schema}/**"
): string | undefined
```

- Calcula caminho relativo (`path.posix.relative`, normalizado com `/`)
- Converte `{schema}` → `([^/]+)`, `**` → `.*`, `*` → `[^/]*`
- Aplica regex; retorna captura em maiúsculas ou `undefined`

### Exemplos

| schemaPattern | Caminho | Resultado |
|---|---|---|
| `db/{schema}/**` | `db/APP/tests/ut_foo.pks` | `APP` |
| `db/{schema}/**` | `db/HR/tests/integration/pkg/ut_x.pks` | `HR` |
| `src/{schema}/tests/**` | `src/LOGIC/tests/ut_bar.pks` | `LOGIC` |
| `db/{schema}/**` | `tests/ut_baz.pks` | `undefined` → `UNKNOWN` |

## `state.suiteMap` (src/state.ts)

```typescript
class TestStateManager {
  private suiteMap = new Map<string, TestItem>();

  setSuiteItem(id: string, item: TestItem): void;
  getSuiteItem(id: string): TestItem | undefined;
  clearSuiteMap(): void;
}
```

Resolve o problema de lookup de suite items em árvores aninhadas. No modo file,
`controller.items.get('suite:name')` funciona. No modo schema, os suites estão
em `schema > package > suite`. O `suiteMap` oferece acesso direto por ID,
independente da profundidade.

Usado por:
- `runForUri` / `runForFolder`: `state.getSuiteItem(`suite:${pkg}`)`
- `runSingleTest`: idem
- `collectAllItems`: fallback via `cachedItems` (já contém suites)

## `collectAllItems` — recursão (`src/testTree.ts`)

```typescript
function collectAllItems(controller, state): TestItem[]
```

Se `state.cachedItems` não vazio → retorna direto. Se vazio, percorre
`controller.items` até 3 níveis (schema → package → suite) para popular
o cache. Necessário para o caso de refresh ainda não ter populado.

## Settings

| Setting | Default | Descrição |
|---|---|---|
| `utplsql.organization` | `file` | `file` ou `schema` |
| `utplsql.organization.schemaPattern` | `db/{schema}/**` | Padrão glob para extrair schema |

## Conexões

<!-- brain:auto:start:conexoes -->
- 📐 Regras: [[BR-SCHEMA-001 - organization bifurca file tree vs schema tree; suiteMap é o lookup canônico|BR-SCHEMA-001]] · [[BR-SCHEMA-002 - extractSchemaFromPath - path.posix.relative e placeholder {schema}|BR-SCHEMA-002]] · [[BR-SCHEMA-003 - collectAllItems usa cachedItems e, se vazio, percorre até 3 níveis|BR-SCHEMA-003]]
- 🔗 [[ADR-003 - Descoberta DB-first e organizacao por schema]]
- ↩️ Referenciada por: [[GLOSS-006 - Schema-mode (organização por schema)|GLOSS-006]]
<!-- brain:auto:end -->
