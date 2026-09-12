# Organização da árvore de testes

A extensão oferece dois modos de organização da árvore no Test Explorer:
por **arquivo** (padrão) ou por **schema Oracle**.

## Modo `file` (padrão)

Organização tradicional, baseada no caminho do arquivo no workspace:

```
TestController
  └── WorkspaceFolder
      └── tests/
          └── ut_my_tests.pks
              ├── Suite: My Feature Tests
              │   ├── test_case_1
              │   └── test_case_2
              └── Suite: Another Suite
                  └── test_case_3
```

## Modo `schema`

Agrupa testes por schema Oracle, extraído do caminho do arquivo via regex:

```
TestController
  ├── Schema: APP
  │   └── Package: UT_MY_TESTS
  │       └── Suite: My Feature Tests
  │           ├── test_case_1
  │           └── test_case_2
  └── Schema: LOGIC
      └── Package: UT_BUSINESS_RULES
          └── Suite: Business Rules
              └── test_case_3
```

![Schema-mode tree](../images/schema-mode-tree.png)

## Configuração

```jsonc
{
  // Ativar modo schema
  "utplsql.organization": "schema",

  // Padrão glob para extrair o nome do schema
  // {schema} é o placeholder — a extensão captura o que estiver nessa posição
  "utplsql.organization.schemaPattern": "db/{schema}/**"
}
```

### Como o schema é extraído

O `schemaPattern` é aplicado ao caminho **relativo** do arquivo dentro do
workspace. O placeholder `{schema}` é substituído por um grupo de captura.

| Estrutura do projeto | schemaPattern | Arquivo | Schema extraído |
|---|---|---|---|
| `db/APP/tests/ut_foo.pks` | `db/{schema}/**` | → | `APP` |
| `db/LOGIC/tests/ut_bar.pks` | `db/{schema}/**` | → | `LOGIC` |
| `src/HR/tests/ut_hr.pks` | `src/{schema}/tests/**` | → | `HR` |
| `tests/ut_baz.pks` | `db/{schema}/**` | → | `UNKNOWN` |

### Schema "UNKNOWN"

Arquivos que não correspondem ao `schemaPattern` são agrupados sob o schema
**"UNKNOWN"**, que aparece por último na árvore. Isso permite identificar
rapidamente arquivos fora da convenção esperada.

### Dicas para multi-schema

- Use uma estrutura de diretórios consistente: `db/{schema}/tests/packages/`
- O `schemaPattern` suporta `**` (qualquer profundidade) e `*` (um nível)
- Schema names são convertidos para **maiúsculas** (case-insensitive como Oracle)
- Alternar entre `file` e `schema` reconstrói a árvore automaticamente
- Funciona com **multi-root**: cada workspace folder mantém seus próprios schemas

## Comportamento

- **Executar todos os testes de um schema:** clique no nó `Schema: APP` e rode
- **Executar um package específico:** clique no nó `Package: UT_MY_TESTS`
- **Toggle entre modos:** mude `organization` e a árvore é reconstruída no
  próximo refresh
- **Padrão sem `{schema}`:** todos os arquivos caem sob `UNKNOWN` — não há
  fallback para o modo `file`

## Descoberta via banco (a partir da 0.11.0)

Quando há conexão configurada (sem prompt), o
refresh **complementa** as suites dos arquivos com suites descobertas direto do
banco via `ALL_OBJECTS`/`ALL_SOURCE` — útil para shared installs e CI onde os
`.pks` não estão no workspace.

- Schemas consultados: união dos schemas extraídos das suites locais com os
  diretórios imediatamente abaixo da base do `schemaPattern` (ex.: `db/*`)
- **Filesystem tem prioridade** no merge (match por `packageName`,
  case-insensitive)
- Packages `UT_*` (framework utPLSQL) são ignorados
- Suites vindas do banco usam URI virtual `utplsql-db:/SCHEMA/PKG.pks` e **não
  têm** CodeLens, decorações inline nem jump to failure — apenas execução
- Fallback silencioso: `ALL_SOURCE` inacessível ou Oracle indisponível
  → só a descoberta por arquivos
