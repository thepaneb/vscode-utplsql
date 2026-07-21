# PRD-02 — Refatoração de `extension.ts`

| Campo | Valor |
|---|---|
| Status | Concluído |
| Autor | Análise automatizada |
| Data | 2026-07-02 |
| Componente | Extensão `paneb.vscode-utplsql` |
| Versão alvo | 0.4.0 |
| Arquivos afetados | `src/extension.ts`, `src/runner.ts` (novo), `src/state.ts` (novo), `src/config.ts`, `package.json` |

## 1. Resumo

Extrair a lógica de `extension.ts` (~280 linhas) em módulos menores e coesos,
eliminar estado global mutável com risco de race condition, e remover código
morto (`testPath`).

## 2. Contexto e problema

- **`extension.ts`** acumula: activation, descoberta, execução, matching
  resultado→teste, cobertura, handlers de comando, watcher, e estado global
  (`detailedCoverage`, `meta`, `runProfileRef`, `coverageProfileRef`).
- **`detailedCoverage`** é um `Map` módulo-level compartilhado entre execuções.
  Se o usuário disparar dois runs em paralelo, o segundo sobrescreve a cobertura
  do primeiro.
- **`testPath`** é lido de `readConfig()` mas **nunca usado** em lugar nenhum.
- **`runForUri`/`runForFolder`** chamam `refresh()` antes de executar,
  varrendo todo o workspace desnecessariamente.
- **`collectAllItems()`** percorre o controller inteiro a cada chamada — sem cache.

## 3. Objetivos / Não-objetivos

**Objetivos**
- Reduzir `extension.ts` para ~80 linhas (só activation + delegação).
- Extrair `runner.ts`: lógica de `executeRun`, `applyResults`, `applyCoverage`.
- Extrair `state.ts`: `meta` WeakMap, `detailedCoverage`, profiles, e funções de
  acesso com isolamento por `TestRun`.
- Remover `testPath` (config morta).
- Otimizar `runForUri`/`runForFolder`: não chamar `refresh` completo.
- Adicionar cache simples em `collectAllItems`.

**Não-objetivos**
- Mudar comportamento visível para o usuário.
- Refatorar `cli.ts` ou `invocation.ts` (escopo separado).
- Adicionar testes novos (escopo no PRD de expansão de testes).

## 4. Requisitos

### RF1 — Extrair `src/state.ts`

```
Estado centralizado com isolamento por execução:
- MetaDataManager: encapsula WeakMap<TestItem, ItemMeta>
- CoverageManager: Map<TestRun, Map<string, FileCoverageDetail[]>>
- ProfileManager: guarda runProfileRef / coverageProfileRef
```

### RF2 — Extrair `src/runner.ts`

```
executeRun(controller, request, token, coverage) → Promise<void>
applyResults(junitPath, leafTests, run, meta) → void
applyCoverage(coveragePath, root, sourcePath, run, coverageManager) → void
```

O `runner` recebe o `state` por parâmetro (injeção), não importa módulo global.

### RF3 — `extension.ts` enxuto

```
activate(context):
  - cria controller
  - delega refresh a state/runner
  - registra profiles, comandos, watcher
  - refresh inicial
```

### RF4 — Remover `testPath`

- Deletar `testPath` de `UtConfig`/`readConfig` em `config.ts`.
- Deletar `utplsql.testPath` de `contributes.configuration.properties` em
  `package.json`.

### RF5 — Otimizar `runForUri`/`runForFolder`

- Não chamar `refresh()` inteiro. Como os itens já estão no controller (populados
  pelo watcher contínuo), usar os existentes e só logar se vazios.

### RF6 — Cache em `collectAllItems`

- Manter um array refletindo `controller.items`, atualizado incrementalmente.

## 5. Solução proposta

### 5.1 `src/state.ts`

```typescript
import * as vscode from 'vscode';
import { ItemMeta } from './types'; // kind: suite | test

export class TestStateManager {
  private meta = new WeakMap<vscode.TestItem, ItemMeta>();
  private coverageStore = new Map<string, vscode.FileCoverageDetail[]>();

  setMeta(item: vscode.TestItem, m: ItemMeta): void { this.meta.set(item, m); }
  getMeta(item: vscode.TestItem): ItemMeta | undefined { return this.meta.get(item); }

  // Coverage isolado por runId (uri.toString())
  setCoverage(uriStr: string, details: vscode.FileCoverageDetail[]): void {
    this.coverageStore.set(uriStr, details);
  }
  getCoverage(uriStr: string): vscode.FileCoverageDetail[] {
    return this.coverageStore.get(uriStr) ?? [];
  }
  clearCoverage(): void { this.coverageStore.clear(); }
}
```

### 5.2 `src/runner.ts`

```typescript
import { TestStateManager } from './state';
import { UtConfig } from './config';
import { Spawn } from './invocation';

export async function executeRun(
  controller: vscode.TestController,
  request: vscode.TestRunRequest,
  token: vscode.CancellationToken,
  coverage: boolean,
  cfg: UtConfig,
  state: TestStateManager
): Promise<void> { /* ... lógica atual movida ... */ }
```

### 5.3 `extension.ts` reduzido

```typescript
import { TestStateManager } from './state';
import { executeRun } from './runner';

const state = new TestStateManager();

export function activate(context: vscode.ExtensionContext) {
  const controller = vscode.tests.createTestController('utplsql', 'utPLSQL');
  // ... profiles delegam a executeRun(state) ...
  // ... comandos delegam a executeRun(state) ...
}
```

## 6. Configuração removida

| Setting | Ação |
|---|---|
| `utplsql.testPath` | **Remover** de `package.json` e `config.ts`. Nunca usado. |

## 7. Plano de testes

- **Unitários** para `state.ts`: `setMeta`/`getMeta`, `setCoverage`/`getCoverage`, `clearCoverage`.
- **Unitários** para `runner.ts`: `applyResults` com dados mockados (JUnit conhecido
  + `TestRun` fake) para verificar chamadas `passed`/`failed`/`skipped`.
- **Integração** existente deve continuar passando pois a activation API não muda.
- **Validação manual**: rodar `Run` e `Run with Coverage`, confirmar que
  resultados e gutters aparecem como antes.

## 8. Riscos e mitigação

| Risco | Mitigação |
|---|---|
| Regressão no matching `applyResults` | Testes unitários com JUnit real do utPLSQL |
| `detailedCoverage` vazio após refactor | Validação manual com cobertura |
| Performance igual ou melhor | Benchmark informal antes/depois |

## 9. Rollout

- Release 0.4.0: incrementar versão no `package.json`, atualizar `CHANGELOG.md`,
  criar **release no GitHub** (o workflow `.github/workflows/publish.yml` publica
  automaticamente).
- `CHANGELOG.md` listando a refatoração como mudança interna.

## 10. Critérios de aceite

- `extension.ts` < 100 linhas.
- `runner.ts` + `state.ts` comresponsabilidades claras e testáveis.
- `testPath` removido sem warning de config desconhecida.
- `npm test` passa (unitários + tipagem).
- Run e Run with Coverage funcionam no Extension Development Host.
