# 04 — Code Coverage

Cobertura de código via `ut_coverage_cobertura_reporter` (formato Cobertura XML),
mapeada para arquivos fonte do workspace.

## Fluxo

```
Oracle direto
    │
    └─► ut_coverage_cobertura_reporter → coverage.xml (buffer Oracle)
            │
            │   mapDbPathsToFiles(xml) → troca filename objeto→arquivo
            │
            ├─► parseCobertura(xml) → FileLines[]
            │       └─► file, lines[] (line, hits)
            │
            ├─► resolveSourceUri(file, workspaceRoot, sourcePath, folderRoot?)
            │       └─► mapeia nome de objeto Oracle → arquivo .sql local
            │
            └─► applyCoverageFromXml(covXml, sourcePath, _root, run, state, folders)
                    │
                    ├─► FileCoverage.fromDetails(uri, details)
                    ├─► run.addCoverage(fc)
                    └─► state.setCoverage(uri.toString(), details)
```

## `parseCobertura` (src/cobertura.ts)

```typescript
function parseCobertura(xml: string): FileLines[]
```

Usa `fast-xml-parser`. Extrai:

```typescript
interface FileLines {
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
  workspaceRoot: string,     // raiz do workspace folder
  sourcePath: string,        // setting utplsql.sourcePath
  folderRoot?: string,       // raiz do folder atual (opcional)
): vscode.Uri | undefined
```

### Estratégia de resolução

1. **Caminho absoluto**: se `file` é um caminho absoluto existente → retorna direto
2. **Relativo ao workspace**: `workspaceRoot + '/' + file` → se existe, retorna
3. **Relativo ao sourcePath**: `workspaceRoot + '/' + sourcePath + '/' + file`
4. **Basename no sourcePath**: testa `sourcePath + '/' + basename(file)`
   (**não** é busca recursiva — apenas um `path.join` direto)
5. **Não encontrado**: retorna `undefined`

## `mapDbPathsToFiles` (src/oracleRunner.ts)

O XML de cobertura do buffer Oracle traz `filename="package body APP.CALC"`
(nome de objeto, não arquivo). Antes de `applyCoverageFromXml`, aplica-se
`mapDbPathsToFiles(xml)`:

- regex `filename="(function|procedure|package body|package|type body|type|view|trigger)\s+[\w$#]+\.([\w$#]+)"`
- converte para `filename="<tipo plural>/<nome>.sql"` (ex.: `packages/CALC.sql`,
  `functions/FN1.sql`) — casando com a estrutura `sourcePath/<tipo>/<nome>.sql`
  esperada pelo `resolveSourceUri`

## `applyCoverageFromXml` (src/results.ts)

Função canônica (PRD-39). Recebe a string XML extraída do buffer Oracle e executa o
pipeline de resolução:

1. `parseCobertura(xml)` → `FileLines[]`
2. Para cada arquivo parseado:
   - Resolve URI via `resolveSourceUri` (testa todos os workspace folders)
   - Cria `vscode.StatementCoverage` para cada linha
   - `FileCoverage.fromDetails(uri, details)` → `run.addCoverage(fc)`
   - `state.setCoverage(uri.toString(), details)` para `loadDetailedCoverage`
3. Se nenhum arquivo foi mapeado → aviso "nenhum arquivo mapeado"

## Mapeamento de objetos Oracle → arquivos

### Mecânica

Sem `a_source_file_mappings`, o `ut_coverage_cobertura_reporter` emite
`filename="<tipo> <schema>.<objeto>"` (ex.: `filename="package body UT3.CALC"`).
O `mapDbPathsToFiles()` converte para o layout local (`packages/CALC.sql`,
`functions/FN.sql`, `procedures/PR.sql`, `types/TY.sql`, `triggers/TR.sql`,
`views/VW.sql`) e o `resolveSourceUri` localiza o arquivo físico, testando
variantes de extensão (`.sql`, `.pks`, `.pkb`, `.prc`, `.fnc`, `.trg`, `.tpb`,
`.bdy`) — o arquivo real pode não usar `.sql`.

> ⚠️ Passar o diretório `sourcePath` como `a_file_paths` de
> `ut_file_mapper.build_file_mappings()` **zera o relatório**: a função espera
> uma lista de **arquivos**, não de diretórios. Por isso a extensão não usa file
> mappings e faz o mapeamento no lado do cliente.

### Estrutura esperada

```
workspace/
├── install/                    ← sourcePath
│   ├── functions/
│   │   └── calculate.sql       (ou .fnc)
│   ├── procedures/
│   │   └── process.sql         (ou .prc)
│   └── packages/
│       └── calculator.sql      (ou .pks/.pkb)
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
- `UTPLSQL_NO_COVERAGE` só era emitido no fluxo legado (CLI) — **não** é emitido no fluxo Oracle-direto atual
- Comando `utplsql.copyGrantsToClipboard` copia grants para clipboard

## Settings

| Setting | Default | Descrição |
|---|---|---|
| `utplsql.sourcePath` | `install` | Pasta do código fonte |
| `utplsql.coverageOwner` | `""` | Schema owner (vazio = usuário conexão) |

## Cobertura por declaração (PRD-48)

`src/plsqlDeclarations.ts` (puro, sem `vscode`). Deriva cobertura por
`PROCEDURE`/`FUNCTION` a partir do fonte local + hits de linha.

```typescript
interface PlsqlDeclaration {
  name: string;
  line: number; // linha 0-based da declaração
}

interface PlsqlDeclarationCoverage extends PlsqlDeclaration {
  executed: boolean;
}

function parsePlsqlDeclarations(text: string): PlsqlDeclaration[]
function deriveDeclarationCoverage(
  text: string,
  fileLines: { line: number; hits: number }[],
): PlsqlDeclarationCoverage[]
```

- `parsePlsqlDeclarations` mascara strings e comentários (preservando quebras
  de linha) e extrai `PROCEDURE`/`FUNCTION` — ignora `MEMBER PROCEDURE/FUNCTION`
- `deriveDeclarationCoverage` agrega os hits por escopo: da declaração até a
  próxima (ou fim do arquivo); `executed = true` se qualquer linha do escopo
  tem hits > 0
- `applyCoverageFromXml` (src/results.ts) lê o fonte local e emite
  `vscode.DeclarationCoverage` junto dos `StatementCoverage`:

```typescript
const srcText = fs.readFileSync(uri.fsPath, 'utf-8');
const declarations = deriveDeclarationCoverage(srcText, f.lines);
for (const d of declarations) {
  details.push(
    new vscode.DeclarationCoverage(d.name, d.executed, new vscode.Position(d.line, 0)),
  );
}
```

- Arquivo ilegível → fallback silencioso (só `StatementCoverage`)

## Cobertura de views (PRD-12)

`src/viewCoverage.ts` (vscode-dependente). Rastreia views executadas durante o
run via `V$SQL` e emite cobertura booleana. Controlado pelo setting
`utplsql.sqlCoverageEnabled` (bool, default `false`).

```typescript
interface SqlCoverageOptions {
  connection: string;
  root: string;
  sourcePath: string;
  run: vscode.TestRun;
  state: TestStateManager;
  folders?: readonly vscode.WorkspaceFolder[];
}

async function applySqlCoverage(options: SqlCoverageOptions): Promise<void>
```

Funções puras (testáveis por unidade):

```typescript
function matchExecutedViews(sqlTexts: string[], viewFiles: ViewFile[]): boolean[]
function viewNameFromPath(filePath: string): string; // "views/foo.sql" → "FOO"
function discoverViewFiles(root: string, sourcePath: string): string[];
```

- Descobre arquivos `views/*.sql` sob `<root>/<sourcePath>/views/` (recursivo)
- Consulta `V$SQL` (`command_type = 3 AND executions > 0 AND parsing_schema_name =
  :owner`, restrito ao usuário da conexão) e faz match
  word-boundary do nome da view em qualquer `SQL_TEXT`
- Executada = 100%, não executada = 0%
- **Best-effort**: qualquer falha (sem oracledb, sem acesso a `V$SQL`,
  timeout) silencia e mantém o comportamento atual
- `callTimeout` de 5s durante a query; a conexão é devolvida ao pool no fim

### Grants

```sql
-- Acesso de leitura ao V$SQL para rastrear views executadas
GRANT SELECT ON SYS.V_$SQL TO <schema>;
```
