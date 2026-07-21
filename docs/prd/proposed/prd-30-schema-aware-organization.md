# PRD-30 — Schema-Aware Test Organization

| Campo | Valor |
|---|---|
| Status | Proposto |
| Autor | Gil Cleber Barboza |
| Data | 2026-07-21 |
| Componente | Extensão `paneb.vscode-utplsql` |
| Versão alvo | 0.9.0 |
| Arquivos afetados | `src/extension.ts`, `src/discovery.ts`, `src/suiteParser.ts`, `src/state.ts`, `src/types.ts` |

## 1. Resumo

Reestruturar a árvore de testes no Test Explorer para refletir a organização
real de schemas Oracle: `Schema > Package > Suite > Test`, em vez da
organização atual puramente baseada em arquivos. Tanto dbFlux quanto Nexo
SQL Studio organizam testes por schema, e esta é uma capacidade que nenhuma
extensão de teste para outras linguagens oferece — um diferencial único
para PL/SQL.

## 2. Contexto e problema

Atualmente a árvore de testes é puramente baseada em arquivos:
```
TestController
  └── WorkspaceFolder
      └── caminho/para/tests/
          └── ut_my_tests.pks
              ├── Suite: My Feature Tests
              │   ├── test_case_1
              │   └── test_case_2
              └── Suite: Another Suite
                  └── test_case_3
```

Para projetos com múltiplos schemas (ex.: `APP`, `LOGIC`, `DATA`), todos os
testes são achatados sob a mesma hierarquia de arquivos. Não há distinção
visual entre testes de schemas diferentes.

dbFlux resolve isso com estrutura de pastas opinada (`db/<schema>/tests/packages/`).
Nexo SQL Studio tem Object Explorer separado. Nenhum oferece agrupamento por
schema _dentro_ do Test Explorer.

## 3. Objetivos / Não-objetivos

**Objetivos**
- Agrupar suites/testes por schema Oracle no Test Explorer
- Extrair o schema do caminho do arquivo ou de metadados da conexão
- Suporte a múltiplos schemas no mesmo workspace
- Configurável via setting (modo de organização: `file`, `schema`)
- Manter compatibilidade com o modo atual (`file`) como fallback

**Não-objetivos**
- Schema browsing como Object Explorer (tabelas, views, etc.) — escopo do Nexo
- Detecção automática de schemas via query Oracle (pode ser feature futura)
- Sincronização bidirecional com o banco (schema tree é readonly)

## 4. Requisitos

### RF1 — Extração do schema a partir do caminho do arquivo

```typescript
// src/discovery.ts
function extractSchemaFromPath(
  filePath: string,
  workspaceFolder: vscode.WorkspaceFolder,
  schemaPattern: string,
): string | undefined {
  const relative = path.relative(workspaceFolder.uri.fsPath, filePath);

  // Exemplos de padrões:
  // "db/{schema}/**" → db/APP/tests/packages/ut_foo.pks → schema="APP"
  // "src/{schema}/tests/**" → src/LOGIC/tests/ut_bar.pks → schema="LOGIC"
  // "**/tests/" → todos os arquivos sob tests/ → sem schema

  const pattern = schemaPattern.replace('{schema}', '([^/]+)');
  const regex = new RegExp(pattern);
  const match = regex.exec(relative);
  return match ? match[1].toUpperCase() : undefined;
}
```

### RF2 — Setting `utplsql.organization`

```json
"utplsql.organization": {
  "type": "string",
  "enum": ["file", "schema"],
  "default": "file",
  "enumDescriptions": [
    "Organize tests by file path (default).",
    "Organize tests by Oracle schema. Use utplsql.organization.schemaPattern to define how schemas are extracted from paths."
  ]
},
"utplsql.organization.schemaPattern": {
  "type": "string",
  "default": "db/{schema}/**",
  "description": "Glob pattern to extract schema name from file path. Use {schema} as placeholder. Only used when utplsql.organization is 'schema'."
}
```

### RF3 — Estrutura da árvore em modo `schema`

```
TestController
  └── Schema: APP
      └── Package: UT_MY_TESTS
          └── Suite: My Feature Tests
              ├── test_case_1
              └── test_case_2
  └── Schema: LOGIC
      └── Package: UT_BUSINESS_RULES
          └── Suite: Business Rules
              └── test_case_3
```

### RF4 — Construção da árvore

```typescript
// src/extension.ts — doRefresh()
function buildSchemaTree(
  controller: vscode.TestController,
  suites: ParsedSuite[],
  organization: 'file' | 'schema',
  schemaPattern: string,
) {
  if (organization === 'file') {
    return buildFileTree(controller, suites); // comportamento atual
  }

  // Agrupa por schema
  const bySchema = new Map<string, ParsedSuite[]>();

  for (const suite of suites) {
    const schema = extractSchemaFromPath(suite.uri.fsPath, suite.folder, schemaPattern);
    const key = schema || 'UNKNOWN';
    if (!bySchema.has(key)) bySchema.set(key, []);
    bySchema.get(key)!.push(suite);
  }

  // Cria TestItems na hierarquia: Schema > Package > Suite > Test
  for (const [schema, schemaSuites] of bySchema) {
    const schemaItem = controller.createTestItem(
      `schema:${schema}`,
      `Schema: ${schema}`,
      suites[0]?.folder?.uri,
    );

    // Agrupa por package (pode ter múltiplos .pks no mesmo schema)
    const byPackage = new Map<string, ParsedSuite[]>();
    for (const suite of schemaSuites) {
      const pkg = suite.packageName;
      if (!byPackage.has(pkg)) byPackage.set(pkg, []);
      byPackage.get(pkg)!.push(suite);
    }

    for (const [pkg, pkgSuites] of byPackage) {
      const pkgItem = controller.createTestItem(
        `package:${schema}:${pkg}`,
        `Package: ${pkg}`,
        pkgSuites[0].uri,
      );
      for (const suite of pkgSuites) {
        // Suite items e test items são criados como hoje
        const suiteItem = createSuiteItem(controller, suite);
        pkgItem.children.add(suiteItem);
      }
      schemaItem.children.add(pkgItem);
    }

    controller.items.add(schemaItem);
  }
}
```

### RF5 — Schema "UNKNOWN"

Para arquivos que não correspondem ao `schemaPattern`, agrupar sob schema
"UNKNOWN" ou "Default". O schema "UNKNOWN" aparece por último na árvore.

**Não-funcionais**
- RNF1 — A mudança de organização requer refresh completo da árvore (descoberta
  já é rápida o suficiente).
- RNF2 — Schema names são case-insensitive (Oracle) mas preservam o casing do
  caminho do arquivo.

## 5. Solução proposta

### 5.1 `src/discovery.ts`

Adicionar `extractSchemaFromPath` como função pura exportada. Testável com
`node --test`.

### 5.2 `src/extension.ts` — `doRefresh()`

Modificar para suportar dois modos de construção de árvore:
1. `file` (default): comportamento atual — preserva compatibilidade
2. `schema`: agrupa por Schema → Package → Suite → Test

### 5.3 `package.json` — settings

Duas novas settings: `utplsql.organization` e `utplsql.organization.schemaPattern`.

### 5.4 Interação com PRD-25 (Status Bar) e PRD-30 (Schema)

O status bar pode mostrar o schema atual quando no modo `schema`:
```
$(database) APP: $(testing-passed) 12/15
```

## 6. Configuração

| Setting | Tipo | Default | Descrição |
|---|---|---|---|
| `utplsql.organization` | enum | `"file"` | Modo de organização da árvore de testes: `file` (por arquivo) ou `schema` (por schema Oracle) |
| `utplsql.organization.schemaPattern` | string | `"db/{schema}/**"` | Padrão glob para extrair nome do schema do caminho do arquivo |

## 7. Plano de testes

- **Unitários** (`src/test/unit/discovery.test.ts`):
  - `extractSchemaFromPath` com padrão `"db/{schema}/**"`:
    - `db/APP/tests/packages/ut_foo.pks` → `"APP"`
    - `db/LOGIC/tests/packages/ut_bar.pks` → `"LOGIC"`
    - `src/ut_baz.pks` → `undefined`
  - `extractSchemaFromPath` com padrão `"src/{schema}/tests/**"`:
    - `src/MYSCHEMA/tests/ut_foo.pks` → `"MYSCHEMA"`
  - `extractSchemaFromPath` com múltiplos níveis entre schema e arquivo
- **Integração**:
  - Modo `file` → árvore idêntica ao comportamento atual
  - Modo `schema` com estrutura `db/{schema}/tests/` → agrupamento Schema > Package > Suite > Test
  - Toggle entre modos → árvore reconstruída corretamente
- **Manual**:
  - Múltiplos schemas no mesmo workspace → separados corretamente
  - Schema "UNKNOWN" para arquivos fora do padrão
  - Executar todos os testes de um schema específico (clique no schema item)

## 8. Riscos e mitigação

| Risco | Mitigação |
|---|---|
| Regex `{schema}` mal configurado quebra a extração | Validar `schemaPattern` contém `{schema}`; se não, fallback para modo `file` |
| Projetos sem estrutura de schemas clara | Modo default é `file`; schema é opt-in |
| Múltiplos patterns para extração (nem todo projeto usa mesma estrutura) | Suportar array de patterns no futuro (escopo inicial: um único pattern) |
| Schema names com caracteres especiais | Escapar corretamente no regex |

## 9. Rollout

- Release 0.9.0 (minor) — novo modo de organização
- Default mantém comportamento atual (`file`)
- CHANGELOG: "Schema-aware organization: novo modo de árvore `schema` agrupa
  testes por Schema > Package > Suite > Test"
- Publicar via release no GitHub

## 10. Critérios de aceite

- `npm test` passa
- Modo `file` (default) → comportamento idêntico ao atual
- Modo `schema` → árvore Schema > Package > Suite > Test correta
- Arquivos sem schema correspondente → agrupados em "UNKNOWN"
- Toggle entre modos reconstrói árvore
- Multi-root: cada folder mantém seus próprios schemas

## 11. Questões em aberto

- Detecção automática do schema via conexão Oracle (query `USER_OBJECTS` ou
  `ALL_OBJECTS`)? — Feature futura, mais precisa que regex de caminho.
- Suporte a `utplsql.organization.schemaPatterns` como array de strings?
  — Versão inicial com único pattern; array se houver demanda.
- Schema alias: permitir mapear nome de diretório → nome real do schema?
  (ex.: diretório `app` → schema `MY_APP_PROD`)
