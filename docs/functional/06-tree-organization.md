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

### Implementação: `buildFileTree`

```typescript
function buildFileTree(controller, suites: SuiteFile[]): void
```

1. Para cada `suite` em `suites`:
   - Cria `suiteItem` com id `suite:${packageName.toLowerCase()}`
   - Label: `${suiteDescription}  (${packageName})`
   - Range: linha do `%suite`
   - Para cada `t` em `suite.tests`:
     - Cria `testItem` com id `test:${packageName}.${procName.toLowerCase()}`
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

### Implementação: `buildSchemaTree`

```typescript
function buildSchemaTree(controller, suites: SuiteFile[], schemaPattern: string): void
```

1. **Agrupa por schema**: `extractSchemaFromPath(suite.uri.fsPath, folder.fsPath, schemaPattern)`
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

## `collectAllItems` — recursão

```typescript
function collectAllItems(controller): TestItem[]
```

Se `state.cachedItems` não vazio → retorna direto. Se vazio, percorre
`controller.items` até 3 níveis (schema → package → suite) para popular
o cache. Necessário para o caso de refresh ainda não ter populado.

## Settings

| Setting | Default | Descrição |
|---|---|---|
| `utplsql.organization` | `file` | `file` ou `schema` |
| `utplsql.organization.schemaPattern` | `db/{schema}/**` | Padrão glob para extrair schema |
