# 03 — Results and Reporting

Parse dos resultados de teste e mapeamento para `vscode.TestItem`.

## Fluxo

```
CLI/Oracle execução
    │
    ├─► JUnit XML (results.xml ou buffer Oracle)
    │       └─► parseJUnit(xml) → TestCaseResult[]
    │
    ├─► applyResults(junitPath, leafTests, run, state) → Map<TestItem.id, status>
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

## `applyResults` (src/runner.ts) — wrapper CLI

```typescript
function applyResults(
  junitPath: string,
  leafTests: vscode.TestItem[],
  run: vscode.TestRun,
  state: TestStateManager,
): Map<string, { status: TestStatus; message?: string }>
```

Wrapper que **lê o arquivo JUnit** e delega para `applyResultsFromCases`
(src/results.ts). Arquivo ausente → todos os leafTests como `errored`
("Sem relatório de resultados (o CLI falhou?).").

### Algoritmo de matching (`applyResultsFromCases` — src/results.ts)

Função canônica compartilhada pelos dois runners (PRD-39):

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

| Função | Antes (duplicada) | Agora |
|---|---|---|
| `applyResultsFromCases` | `runner.ts` + `oracleRunner.ts` | `results.ts` — ambos importam |
| `countResults` / `countResultsFromCases` | idem | `results.ts` — nome único `countResults` |
| `applyCoverageFromXml` | idem | `results.ts` — `runner.ts` mantém wrapper `applyCoverage` (lê arquivo + setup diagnostics) |
| `resolveStackFrameToUri` | idem | `results.ts` — com fallback para `{objName}.pks` no workspace |

> `resolveStackLocation` não existe mais — só `resolveStackFrameToUri`.

`matching.ts` permanece **puro** em runtime (o `import type` de `vscode` é
apagado na compilação).

## Reporters

### Reporters padrão

Sempre incluídos:
- `ut_documentation_reporter` — stdout (-c)
- `ut_junit_reporter` — XML para resultados (-o results.xml)
- `ut_coverage_cobertura_reporter` — XML para cobertura (-o coverage.xml, se coverage=true)

### Reporters adicionais

```typescript
// Config fixa (settings.json)
"utplsql.additionalReporters": ["UT_COVERAGE_HTML_REPORTER"]

// Volátil (comando, uma execução)
state.setExtraReporter(name) → state.consumeExtraReporter()
```

### Validação dinâmica (`listReporters`)

```typescript
function listReporters(cfg: InvocationConfig, conn: string): Promise<string[] | { error: string }>
```

Executa `utplsql reporters <conn>` e faz parse da saída. Usado para:
- Verificar disponibilidade de `UT_COVERAGE_COBERTURA_REPORTER` antes de habilitar cobertura
- Popular QuickPick do comando `utplsql.selectReporter`

### `parseReportersOutput`

```typescript
function parseReportersOutput(stdout: string): string[]
```

- Linhas com `:` são nomes de reporter (formato 3.2.x)
- Descrições indentadas são ignoradas
- Usa `l.match(/^([A-Za-z0-9_]+)/)` **sem `.trim()`** — `.trim()` quebrava linhas indentadas

## Output

O output do documentation reporter é exibido em tempo real via `run.appendOutput()`.
No modo Oracle, linhas não-XML são exibidas; no modo CLI, o callback `onStdout`
alimenta o output.

Após execução, `compilationDiagnostics.parseFromOutput()` analisa o output em busca
de erros de compilação (veja [07 — Diagnostics](07-diagnostics-and-validation.md)).
