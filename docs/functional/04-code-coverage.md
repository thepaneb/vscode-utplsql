# 04 — Code Coverage

Cobertura de código via `ut_coverage_cobertura_reporter` (formato Cobertura XML),
mapeada para arquivos fonte do workspace.

## Fluxo

```
utPLSQL CLI / Oracle direto
    │
    └─► ut_coverage_cobertura_reporter → coverage.xml (ou buffer Oracle)
            │
            ├─► parseCobertura(xml) → CoberturaFile[]
            │       └─► file, lines[] (line, hits)
            │
            ├─► resolveSourceUri(fileName, folderFsPath, sourcePath, root)
            │       └─► mapeia nome de objeto Oracle → arquivo .sql local
            │
            └─► applyCoverage(coveragePath, root, sourcePath, run, state, folders)
                    │
                    ├─► FileCoverage.fromDetails(uri, details)
                    ├─► run.addCoverage(fc)
                    └─► state.setCoverage(uri, details)
```

## `parseCobertura` (src/cobertura.ts)

```typescript
function parseCobertura(xml: string): CoberturaFile[]
```

Usa `fast-xml-parser`. Extrai:

```typescript
interface CoberturaFile {
  file: string;     // nome do arquivo (ex: "packages/calculator.sql")
  lines: { line: number; hits: number }[];
}
```

- Itera `<class>` dentro de `<package>` dentro de `<packages>`
- Ignora classes sem `@_filename`
- Filtra linhas com número inválido (`NaN`)

## `resolveSourceUri` (src/coverage.ts)

```typescript
function resolveSourceUri(
  file: string,              // nome do arquivo do XML (ex: "packages/calculator.sql")
  folderFsPath: string,      // raiz do workspace folder
  sourcePath: string,        // setting utplsql.sourcePath
  root: string,              // mesmo que folderFsPath
): vscode.Uri | undefined
```

### Estratégia de resolução

1. **Caminho absoluto**: se `file` é um caminho absoluto existente → retorna direto
2. **Relativo ao workspace**: `folderFsPath + '/' + file` → se existe, retorna
3. **Relativo ao sourcePath**: `folderFsPath + '/' + sourcePath + '/' + file`
4. **Basename no sourcePath**: procura `file` recursivamente dentro de `sourcePath`
5. **Não encontrado**: retorna `undefined`

## `applyCoverage` (src/runner.ts) — wrapper CLI

```typescript
function applyCoverage(
  coveragePath: string,
  _root: string,
  sourcePath: string,
  run: vscode.TestRun,
  state: TestStateManager,
  folders?: WorkspaceFolder[],
): void
```

1. `state.clearCoverage()` — limpa cobertura anterior
2. Se arquivo não existe → diagnóstico + `run.appendOutput()` com sugestão de grants
3. Se `setupDiagnosticsEnabled` → `setupValidator.addCoverageDiagnostic()` (PRD-32)
4. Lê o XML e delega para `applyCoverageFromXml` (src/results.ts)

## `applyCoverageFromXml` (src/results.ts)

Função canônica (PRD-39), usada pelos dois runners. Recebe a string XML
(extraída do buffer no modo Oracle, do arquivo no modo CLI) e executa o
pipeline de resolução:

1. `parseCobertura(xml)` → `FileLines[]`
2. Para cada arquivo parseado:
   - Resolve URI via `resolveSourceUri` (testa todos os workspace folders)
   - Cria `vscode.StatementCoverage` para cada linha
   - `FileCoverage.fromDetails(uri, details)` → `run.addCoverage(fc)`
   - `state.setCoverage(uri, details)` para `loadDetailedCoverage`
3. Se nenhum arquivo foi mapeado → aviso "nenhum arquivo mapeado"

## Mapeamento de objetos Oracle → arquivos

### Configuração (`coverageSourceArgs`)

O utPLSQL-cli aceita args para mapear objetos cobertos a arquivos:

```jsonc
{
  "utplsql.coverageSourceArgs": [
    "-regex_expression=.*[/\\\\](\\w+)[/\\\\](\\w+)\\.sql$",
    "-type_subexpression=1",    // grupo 1 = tipo (pasta)
    "-name_subexpression=2",    // grupo 2 = nome do objeto
    "-type_mapping=packages=PACKAGE BODY/functions=FUNCTION/procedures=PROCEDURE/triggers=TRIGGER"
  ]
}
```

O XML de saída contém `filename="functions/calculate.sql"` — o `resolveSourceUri`
mapeia isso para o arquivo físico no workspace.

### Estrutura esperada

```
workspace/
├── install/                    ← sourcePath
│   ├── functions/
│   │   └── calculate.sql
│   ├── procedures/
│   │   └── process.sql
│   └── packages/
│       └── calculator.sql
```

### `-owner`

Derivado de `utplsql.coverageOwner` (se vazio, usa o usuário da conexão em maiúsculas).

## Grants necessários

```sql
-- Sempre necessário para cobertura
GRANT EXECUTE ON SYS.DBMS_PROFILER TO <schema>;
GRANT EXECUTE ON SYS.DBMS_PLSQL_CODE_COVERAGE TO <schema>;
```

### Diagnóstico de falha

Se `coverage.xml` não for gerado:
- Output mostra caminho esperado + arquivos no diretório temp
- Se `setupDiagnosticsEnabled`: diagnostic `UTPLSQL_NO_COVERAGE` no Problems Panel
- Comando `utplsql.copyGrantsToClipboard` copia grants para clipboard

## Settings

| Setting | Default | Descrição |
|---|---|---|
| `utplsql.sourcePath` | `install` | Pasta do código fonte |
| `utplsql.coverageOwner` | `""` | Schema owner (vazio = usuário conexão) |
| `utplsql.coverageSourceArgs` | (regex) | Args de mapeamento objeto→arquivo |
