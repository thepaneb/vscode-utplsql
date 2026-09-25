---
tipo: funcional
status: ativo
numero: 03
titulo: "03 — Results and Reporting"
publicar: docs/functional/03-results-and-reporting.md
verificado: 2026-09-25
regras: ["BR-PARSE-011", "BR-PARSE-012", "BR-PARSE-013", "BR-PARSE-014"]
tags: [funcional]
---
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

### `testsuite` aninhado (recursivo)

O `ut_junit_reporter` **aninha `<testsuite>` por nível** (`schema` › `package` ›
`suite`) — é o que acontece com `--%suitepath` e o padrão em instalação
compartilhada (utPLSQL em `UT3`, suites em outro schema). Os `<testcase>` vivem
no nível mais interno, então a visita é **recursiva**:

```
testsuites
└── testsuite name="utplsql_test"        ← visit(suite)
    ├── testcase ...                     ← testcases do nível atual
    └── testsuite name="Math failures"   ← visit(nested) — recursivo
        └── testcase ...
```

- `visit(suite)` lê os `testcase` do nível e **depois** desce nos `testsuite`
  aninhados — a ordem dos resultados preserva o documento (testcases do nível
  atual antes dos aninhados).
- O ponto de entrada continua iterando `root.testsuite` (aceita `testsuites`
  com um ou vários `testsuite`, e a raiz já sendo `testsuite`).
- Sem essa descida o parse devolvia `[]` e todo leaf test era marcado como
  skipped com `[aviso] Nenhum resultado JUnit encontrado para "..."` — os testes
  rodavam, mas sem resultado. Detalhado em
  [08 — Jump to Failure](08-jump-to-failure.md).

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
| `packageFromFrameObject` | Extrai o package de um frame qualificado: 1 segmento = ele, 2 = último, 3+ = penúltimo |
| `resolveStackFrameToUri` | Resolve frames de stack trace para URIs de arquivo (compara `packageName`; fallback `<packageName>.pks`) |

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

### `listReportersOracle` (src/oracleRunner.ts)

```typescript
function listReportersOracle(conn): Promise<string[]>
```

- Consulta `SELECT reporter_object_name FROM TABLE(ut_runner.get_reporters_list())`
- Erro de acesso/instalação → retorna array vazio (best-effort)
- `checkReporterExists(conn, name)` valida o nome (case-insensitive) contra essa lista

## Output

O output do documentation reporter é exibido em tempo real via `run.appendOutput()`.
Linhas não-XML são exibidas diretamente; linhas XML são acumuladas para parse.

> Diagnósticos de compilação são publicados **após o run** por
> `commands/run.ts` → `refreshCompilationDiagnostics()` (veja
> [07 — Diagnostics](07-diagnostics-and-validation.md)).

## Conexões

<!-- brain:auto:start:conexoes -->
- 📐 Regras: [[BR-PARSE-011 - Precedência de status JUnit failure - error - skipped - passed|BR-PARSE-011]] · [[BR-PARSE-012 - Stack trace - regex quoted-unquoted e filtro de frames do framework|BR-PARSE-012]] · [[BR-PARSE-013 - Mapeamento resultado para teste por lastSegment+name-description com fallback|BR-PARSE-013]] · [[BR-PARSE-014 - message.location só é definida para failed-error com frame de usuário resolvido|BR-PARSE-014]]
- ↩️ Referenciada por: [[GLOSS-004 - Reporter|GLOSS-004]] · [[PAT-003 - Funções canônicas compartilhadas de resultado|PAT-003]] · [[TPL-FASTXML - fast-xml-parser|TPL-FASTXML]]
<!-- brain:auto:end -->
