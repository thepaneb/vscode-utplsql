# PRD-39 — Eliminar código duplicado entre runner.ts e oracleRunner.ts

| Campo | Valor |
|---|---|
| Status | Em desenvolvimento |
| Autor | Gil Cleber |
| Data | 2026-08-08 |
| Componente | Extensão `paneb.vscode-utplsql` |
| Versão alvo | 0.10.0 |
| Arquivos afetados | `src/results.ts` (novo), `src/runner.ts`, `src/oracleRunner.ts` |

## 1. Resumo

Extrair as 4 funções duplicadas entre `runner.ts` (CLI) e `oracleRunner.ts` (Oracle direto) para um módulo compartilhado, eliminando o "Duplicated Code" (Fowler) e reduzindo a superfície de manutenção em ~160 linhas.

## 2. Contexto e problema

As skills `code-review` (mattpocock) e `tdd` identificam código duplicado como smell prioritário. A análise do código atual revelou 4 pares de funções com lógica idêntica ou quase idêntica:

| `runner.ts` (CLI) | `oracleRunner.ts` (Oracle) | Duplicação |
|---|---|---|
| `applyResults` (L337-386) | `applyResultsFromCases` (L225-301) | Matching + reporting, ~50 linhas cada |
| `countResults` (L311-335) | `countResultsFromCases` (L303-333) | Idêntico, ~25 linhas |
| `applyCoverage` (L478-533) | `applyCoverageFromXml` (L335-369) | Parse + map + apply, ~55 linhas |
| `resolveStackFrameToUri` (L445-476) | `resolveStackLocation` (L207-223) | Stack frame → Location, ~30 linhas |

A diferença entre os pares é apenas a **fonte dos dados**: o CLI lê de arquivos em disco (via `fs.readFileSync`), o Oracle runner recebe dados em memória (string XML). A lógica de matching, reporting e mapeamento de cobertura é a mesma.

## 3. Objetivos / Não-objetivos

**Objetivos**
- Extrair `countResults` para função única exportada de `runner.ts`
- Unificar `applyResults` e `applyResultsFromCases` aceitando `TestCaseResult[]`
- Unificar `applyCoverage` e `applyCoverageFromXml` aceitando `xml: string`
- Unificar `resolveStackFrameToUri` em `matching.ts`
- Manter wrappers no CLI runner que leem arquivos antes de delegar

**Não-objetivos**
- Não altera o algoritmo de matching ou reporting
- Não altera a interface pública dos módulos
- Não introduz novo módulo (a menos que necessário para evitar imports circulares)

## 4. Requisitos

### RF1 — `countResults` unificado

Exportar `countResults` de `results.ts`. Remover `countResultsFromCases` de `oracleRunner.ts`. `runner.ts` e `oracleRunner.ts` importam de `results.ts`.

### RF2 — `applyResults` unificado

`applyResultsFromCases` vira a função canônica em `results.ts`, aceitando `TestCaseResult[]` (dados em memória). O CLI runner lê arquivo JUnit antes de chamar:

```typescript
// runner.ts — wrapper CLI
export function applyResults(junitPath: string, ...): Map<...> {
  if (!fs.existsSync(junitPath)) { /* erro */ return resultMap; }
  const cases = parseJUnit(fs.readFileSync(junitPath, 'utf8'));
  return applyResultsFromCases(cases, leafTests, run, state);
}
```

### RF3 — `applyCoverage` unificado

`applyCoverageFromXml` vira a função canônica em `results.ts`, aceitando `xml: string` (parse → map → apply + aviso "nenhum arquivo mapeado"). O CLI runner lê o arquivo Cobertura antes de chamar. O diagnóstico de setup do CLI (arquivo ausente, listagem de irmãos, `setupValidator.addCoverageDiagnostic`) permanece no wrapper.

### RF4 — `resolveStackFrameToUri` unificado

Ambas as implementações são unificadas em `resolveStackFrameToUri` exportado de `results.ts`. `oracleRunner.ts` e `runner.ts` importam de `results.ts`.

**Não-funcionais**
- RNF1 — Nenhum `console.log` ou `debugger` residual
- RNF2 — Sem imports circulares entre os módulos (`results.ts` não importa de `runner.ts`/`oracleRunner.ts`)
- RNF3 — `matching.ts` permanece puro (sem import de `vscode` — tabela de módulos do AGENTS.md)

## 5. Solução proposta

### 5.1 Novo módulo `src/results.ts` (decisão D1)

As funções unificadas vivem em um **novo módulo `src/results.ts`** (dependente de
`vscode`, como `runner.ts`/`oracleRunner.ts`). Nem `runner.ts` (criaria import
circular: `runner → oracleRunner → runner`) nem `matching.ts` (é módulo puro —
AGENTS.md exige que continue sem import de `vscode`) são candidatos.

```typescript
// results.ts — funções canônicas (recebem dados em memória)
import * as vscode from 'vscode';
import { isUserFrame, type StackFrame, type TestCaseResult, type TestStatus } from './junit';
import type { TestStateManager } from './state';

export function countResults(cases: TestCaseResult[]): RunResults { ... }

export function applyResultsFromCases(
  cases: TestCaseResult[],
  leafTests: vscode.TestItem[],
  run: vscode.TestRun,
  state: TestStateManager,
): Map<string, { status: TestStatus; message?: string }> { ... }

export function applyCoverageFromXml(
  covXml: string,
  sourcePath: string,
  root: string,
  run: vscode.TestRun,
  state: TestStateManager,
  folders?: readonly vscode.WorkspaceFolder[],
): void { ... }

export function resolveStackFrameToUri(
  stackFrames: StackFrame[],
  state: TestStateManager,
): vscode.Location | undefined { ... }

export function findByNameOnly(...): vscode.TestItem | undefined { ... }
export function lastSegment(classname: string): string { ... }
```

`RunResults` (hoje em `runner.ts:303-309`) também migra para `results.ts`.

### 5.2 runner.ts e oracleRunner.ts delegam

```typescript
// runner.ts
import { applyResultsFromCases, applyCoverageFromXml, countResults, resolveStackFrameToUri } from './results';

// oracleRunner.ts
import { applyResultsFromCases, applyCoverageFromXml, countResults, resolveStackFrameToUri } from './results';

// Remove de oracleRunner.ts: countResultsFromCases, applyResultsFromCases,
//   resolveStackLocation, applyCoverageFromXml
// Remove de runner.ts: countResults, report(), resolveStackFrameToUri,
//   a lógica de matching/coverage interna (vira wrapper)
```

### 5.3 matching.ts permanece puro

`matching.ts` continua sem import de `vscode` (mantém `filterSuitesByUri` e
`filterSuitesByFolder`). Nenhuma mudança nesse arquivo.

## 6. Configuração

Nenhuma nova setting.

## 7. Plano de testes

- **Unitários**: `results.test.ts` (novo) — `applyResultsFromCases` com array em memória, `countResults`, `applyCoverageFromXml` (map + "nenhum arquivo mapeado"), `resolveStackFrameToUri` com frames de usuário e internos, fallback por `{objName}.pks` no workspace.
- **Unitários**: `runner.test.ts` — wrapper `applyResults` (arquivo ausente → erro; arquivo presente → delega), wrapper `applyCoverage` (diagnóstico de setup preservado).
- **Unitários**: `oracleRunner.test.ts` — imports ajustados para `results.ts`; comportamento de matching/coverage coberto em `results.test.ts`.
- **Regressão**: `node --test out/test/unit/**/*.test.js` — todos os testes existentes passam.

## 8. Riscos e mitigação

| Risco | Mitigação |
|---|---|
| Regressão de matching (case sensitivity, fallback por nome) | A lógica não muda — apenas se move. Testes de regressão cobrem edge cases existentes. |
| Import circular `runner.ts` ↔ `oracleRunner.ts` | `results.ts` não importa de nenhum dos dois — imports unidirecionais: `runner → results`, `oracleRunner → results`. |
| `applyResultsFromCases` do CLI e Oracle tinham diferenças sutis | Usar a implementação mais completa (Oracle runner, que tem `createTestMessage` com `stackFrames`) e preservar o aviso de unmatched do CLI (decisão D3). |
| Perda de pureza de `matching.ts` | `matching.ts` não é tocado — `resolveStackFrameToUri` vai para `results.ts` (decisão D1). |

## 9. Rollout

- Versão alvo: `0.10.0` (minor)
- Breaking change: nenhum (APIs internas, não exportadas na API pública da extensão)
- Pode ser feito junto com PRD-40 (Long Parameter List) — mesmos arquivos

## 10. Critérios de aceite

- [ ] `countResultsFromCases` removido de `oracleRunner.ts`
- [ ] `applyResultsFromCases` removido de `oracleRunner.ts` (importado de `results.ts`)
- [ ] `applyCoverageFromXml` removido de `oracleRunner.ts` (importado de `results.ts`)
- [ ] `resolveStackLocation` removido de `oracleRunner.ts` (importado de `results.ts`)
- [ ] `results.ts` exporta `applyResultsFromCases`, `countResults`, `applyCoverageFromXml`, `resolveStackFrameToUri`
- [ ] `runner.ts` exporta wrappers `applyResults` e `applyCoverage` (leitura de arquivo + diagnóstico CLI)
- [ ] `matching.ts` permanece puro (sem import de `vscode`)
- [ ] `npm run compile && npm run lint && node --test` passam

## 11. Decisões

**D1 — Módulo novo `src/results.ts` (não `runner.ts` nem `matching.ts`)**: `runner.ts`
já importa `executeRunOracle` de `oracleRunner.ts` (runner.ts:20) — colocar as funções
canônicas em `runner.ts` criaria import circular (`runner → oracleRunner → runner`),
violando RNF2. `matching.ts` é módulo **puro** (sem `vscode`) pela tabela do AGENTS.md
e tem 12 testes puros — receber `vscode.Location`/`TestItem` quebraria essa pureza.
`results.ts` (dependente de `vscode`, como os dois runners) elimina o ciclo e preserva
a arquitetura. Justifica a exceção do não-objetivo "não introduzir novo módulo".

**D2 — Setup diagnostics ficam no wrapper CLI**: o diagnóstico de `applyCoverage`
(arquivo ausente, listagem de irmãos em `%TEMP%`, `setupValidator.addCoverageDiagnostic`)
depende de `fs`, `path` e `setupValidator` — contexto exclusivo do CLI. A função
unificada `applyCoverageFromXml` faz apenas parse → map → apply + aviso "nenhum
arquivo mapeado" (comum aos dois modos). O aviso de XML vazio do Oracle runner
("relatório não gerado") permanece inline no `executeRunOracle`, como hoje.

**D3 — `report()` do CLI é removido; switch unificado inline**: o switch da
`applyResultsFromCases` do Oracle (com `stackFrames` → `message.location`) é a
versão mais completa — ela vira a canônica e o CLI passa a se beneficiar do
`Go to Error` também. O aviso de unmatched do CLI ("Nenhum resultado JUnit
encontrado para...") é preservado na função unificada: no modo Oracle ele passa
a aparecer quando há mismatch — ganho diagnóstico, não regressão.
