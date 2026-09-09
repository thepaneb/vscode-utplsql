# 03 — Results and Reporting

Parse dos resultados de teste e mapeamento para `vscode.TestItem`.

## Fluxo

```
Execução
    │
    ├─► JUnit XML (buffer Oracle)
    │       └─► parseJUnit(xml) → TestCaseResult[]
    │
    ├─► applyResultsFromCases(cases, leafTests, run, state) → Map<TestItem.id, status>
    │       │
    │       ├─► index: Map<"pkg|procName" | "pkg|description", TestItem>
    │       ├─► match: lastSegment(classname) + name → TestItem
    │       ├─► fallback: findByNameOnly (procName ou description)
    │       └─► report(run, item, status, message, ms, stackFrames, state)
    │               └─► run.passed / run.failed / run.errored / run.skipped
    │
    └─► state.setLastResults / setLastFailedItems / setLastRun
```

## `parseJUnit` (src/junit.ts)

```typescript
function parseJUnit(xml: string): TestCaseResult[]
```

Usa `fast-xml-parser` com `ignoreAttributes: false`.

### `TestCaseResult`

```typescript
interface TestCaseResult {
  classname: string;        // ex: "app.test_exemplo" (schema.package)
  name: string;             // descrição do %test
  status: TestStatus;       // 'passed' | 'failed' | 'error' | 'skipped'
  message?: string;         // mensagem de falha/erro
  durationMs?: number;      // duração em ms (time × 1000)
  stackFrames?: StackFrame[]; // stack trace (PRD-29)
}
```

### Extração de status

```
<testcase classname="..." name="..." time="0.05">
    <failure message="..." type="...">body</failure>   → status: 'failed'
    <error message="..." type="...">body</error>        → status: 'error'
    <skipped/>                                          → status: 'skipped'
    (sem tags)                                          → status: 'passed'
</testcase>
```

### `extractMessage`

Junta `@_message` (atributo) + `#text` (corpo) separados por `\n`. Fallback `"Falhou"`.

### `extractBody`

Extrai `#text` do nó XML (usado por `parseStackFrames`).

## Algoritmo de matching (`applyResultsFromCases` — src/results.ts)

Função canônica compartilhada pelo runner (PRD-39):

1. **Índice**: para cada `leafTest`, indexa por `"pkg|procName"` e `"pkg|description"` (lowercase)
2. **Match primário**: `lastSegment(c.classname) + c.name` → lookup no índice
3. **Fallback**: `findByNameOnly` — varre todos os leafTests procurando `procName` ou `description`
4. **Unmatched**: testes sem correspondência → `run.appendOutput('[aviso] Nenhum resultado JUnit...')` + `run.skipped(item)`
5. **Switch de status inline**: `passed`/`failed`/`error`/`skipped`; `failed`/`error` com
   `stackFrames` populam `message.location` via `resolveStackFrameToUri`
   (veja [08 — Jump to Failure](08-jump-to-failure.md))

### `lastSegment`

```typescript
function lastSegment(classname: string): string
```
Extrai último segmento separado por `.` ou `:` (ex: `"schema.pkg"` → `"pkg"`).

## `results.ts` — funções canônicas (PRD-39)

| Função | Descrição |
|---|---|
| `applyResultsFromCases` | Mapeia TestCaseResult[] para TestItem por matching de classname+name |
| `countResults` | Conta passed/failed/skipped/errored |
| `applyCoverageFromXml` | Aplica cobertura a partir de XML Cobertura |
| `resolveStackFrameToUri` | Resolve frames de stack trace para URIs de arquivo |

> `resolveStackLocation` não existe mais — só `resolveStackFrameToUri`.

`matching.ts` permanece **puro** em runtime (o `import type` de `vscode` é
apagado na compilação).

## Reporters

### Reporters padrão

Sempre incluídos:
- `ut_documentation_reporter` — streaming (linhas não-XML exibidas em tempo real)
- `ut_junit_reporter` — XML para resultados (buffer Oracle)
- `ut_coverage_cobertura_reporter` — XML para cobertura (buffer Oracle, se coverage=true)

### Reporters adicionais

```typescript
// Config fixa (settings.json)
"utplsql.additionalReporters": ["UT_COVERAGE_HTML_REPORTER"]

// Volátil (comando, uma execução)
state.setExtraReporter(name) → state.consumeExtraReporter()
```

### `parseReportersOutput`

```typescript
function parseReportersOutput(stdout: string): string[]
```

- Linhas com `:` são nomes de reporter (formato 3.2.x)
- Descrições indentadas são ignoradas
- Usa `l.match(/^([A-Za-z0-9_]+)/)` **sem `.trim()`** — `.trim()` quebrava linhas indentadas

## Output

O output do documentation reporter é exibido em tempo real via `run.appendOutput()`.
Linhas não-XML são exibidas diretamente; linhas XML são acumuladas para parse.

Após execução, `compilationDiagnostics.parseFromOutput()` analisa o output em busca
de erros de compilação (veja [07 — Diagnostics](07-diagnostics-and-validation.md)).
