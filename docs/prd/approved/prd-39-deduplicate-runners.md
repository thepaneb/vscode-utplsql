# PRD-39 — Eliminar código duplicado entre runner.ts e oracleRunner.ts

| Campo | Valor |
|---|---|
| Status | Aprovado |
| Autor | Gil Cleber |
| Data | 2026-08-08 |
| Componente | Extensão `paneb.vscode-utplsql` |
| Versão alvo | 0.10.0 |
| Arquivos afetados | `src/runner.ts`, `src/oracleRunner.ts`, `src/matching.ts` |

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

Exportar `countResults` de `runner.ts`. Remover `countResultsFromCases` de `oracleRunner.ts`. `oracleRunner.ts` importa de `runner.ts`.

### RF2 — `applyResults` unificado

Renomear `applyResultsFromCases` para função canônica que aceita `TestCaseResult[]` (dados em memória). O CLI runner lê arquivo JUnit antes de chamar:

```typescript
// runner.ts — wrapper CLI
export function applyResults(junitPath: string, ...): Map<...> {
  if (!fs.existsSync(junitPath)) { /* erro */ return resultMap; }
  const cases = parseJUnit(fs.readFileSync(junitPath, 'utf8'));
  return applyResultsFromCases(cases, leafTests, run, state);
}
```

### RF3 — `applyCoverage` unificado

Renomear `applyCoverageFromXml` para função canônica que aceita `xml: string`. O CLI runner lê arquivo Cobertura antes de chamar. Diagnóstico de setup permanece no wrapper CLI.

### RF4 — `resolveStackFrameToUri` unificado

Mover ambas as implementações para `matching.ts`, unificando-as. O `oracleRunner.ts` passa a importar de `matching.ts`.

**Não-funcionais**
- RNF1 — Nenhum `console.log` ou `debugger` residual
- RNF2 — Sem imports circulares entre os módulos

## 5. Solução proposta

### 5.1 Função canônica em runner.ts

```typescript
// runner.ts — função unificada (recebe dados em memória)
export function applyResultsFromCases(
  cases: TestCaseResult[],
  leafTests: vscode.TestItem[],
  run: vscode.TestRun,
  state: TestStateManager,
): Map<string, { status: TestStatus; message?: string }> {
  // lógica de matching extraída de oracleRunner.ts L225-301
  // (ambas as implementações são equivalentes — usar a mais completa)
}

// Wrapper CLI que lê arquivo
export function applyResults(
  junitPath: string, leafTests, run, state
): Map<...> {
  if (!fs.existsSync(junitPath)) {
    for (const t of leafTests)
      run.errored(t, new vscode.TestMessage('Sem relatório de resultados (o CLI falhou?).'));
    return new Map();
  }
  const cases = parseJUnit(fs.readFileSync(junitPath, 'utf8'));
  return applyResultsFromCases(cases, leafTests, run, state);
}
```

### 5.2 oracleRunner.ts simplificado

```typescript
import { applyResultsFromCases, countResults } from './runner';
import { resolveStackFrameToUri } from './matching';

// Remove: countResultsFromCases, applyResultsFromCases, resolveStackLocation
// Usa as importadas diretamente
```

### 5.3 matching.ts

```typescript
// Unifica resolveStackLocation (oracleRunner) + resolveStackFrameToUri (runner)
export function resolveStackFrameToUri(
  stackFrames: StackFrame[],
  state: TestStateManager,
): vscode.Location | undefined {
  const userFrame = stackFrames.find(isUserFrame);
  if (!userFrame || userFrame.line <= 0) return undefined;

  const objName = userFrame.objectName.toLowerCase();
  for (const item of state.cachedItems) {
    const meta = state.getMeta(item);
    if (!meta?.uri || meta.kind !== 'suite') continue;
    if (meta.packageName.toLowerCase() !== objName) continue;
    const line = Math.max(0, userFrame.line - 1);
    return new vscode.Location(meta.uri, new vscode.Position(line, 0));
  }
  return undefined;
}
```

## 6. Configuração

Nenhuma nova setting.

## 7. Plano de testes

- **Unitários**: `runner.test.ts` — adicionar teste para `applyResultsFromCases` com array em memória mockado
- **Unitários**: `oracleRunner.test.ts` — verificar que funções são importadas de `runner.ts` e `matching.ts`
- **Unitários**: `matching.test.ts` — teste para `resolveStackFrameToUri` com frames de usuário e internos
- **Regressão**: `node --test out/test/unit/**/*.test.js` — todos os testes existentes passam

## 8. Riscos e mitigação

| Risco | Mitigação |
|---|---|
| Regressão de matching (case sensitivity, fallback por nome) | A lógica não muda — apenas se move. Testes de regressão cobrem edge cases existentes. |
| Import circular `runner.ts` ↔ `oracleRunner.ts` | `oracleRunner.ts` já importa de `runner.ts` via tipos. Refatoração mantém imports unidirecionais: `oracleRunner → runner`, `oracleRunner → matching`. |
| `applyResultsFromCases` do CLI e Oracle tinham diferenças sutis | Usar a implementação mais completa (Oracle runner, que tem `createTestMessage` com `stackFrames`) e garantir que CLI também se beneficia. |

## 9. Rollout

- Versão alvo: `0.10.0` (minor)
- Breaking change: nenhum (APIs internas, não exportadas na API pública da extensão)
- Pode ser feito junto com PRD-40 (Long Parameter List) — mesmos arquivos

## 10. Critérios de aceite

- [ ] `countResultsFromCases` removido de `oracleRunner.ts`
- [ ] `applyResultsFromCases` removido de `oracleRunner.ts` (importado de `runner.ts`)
- [ ] `applyCoverageFromXml` removido de `oracleRunner.ts` (importado de `runner.ts`)
- [ ] `resolveStackLocation` removido de `oracleRunner.ts` (importado de `matching.ts`)
- [ ] `runner.ts` exporta `applyResultsFromCases`, `countResults`, `applyCoverageFromXml`
- [ ] `matching.ts` exporta `resolveStackFrameToUri`
- [ ] `npm run compile && npm run lint && node --test` passam

## 11. Questões em aberto

- As funções unificadas devem ficar em `runner.ts` ou em módulo novo `src/results.ts`?
- O `applyCoverageFromXml` do CLI faz setup diagnostics (verifica se arquivo existe, lista arquivos no diretório). Manter no wrapper ou mover para a função unificada?
- `report()` em `runner.ts:388-422` é usada apenas pelo CLI. Unificar com o switch inline do Oracle runner ou manter separado?
