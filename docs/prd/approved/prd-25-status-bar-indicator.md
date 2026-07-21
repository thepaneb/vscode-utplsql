# PRD-25 — Status Bar Indicator

| Campo | Valor |
|---|---|
| Status | Aprovado |
| Autor | Gil Cleber Barboza |
| Data | 2026-07-21 |
| Componente | Extensão `paneb.vscode-utplsql` |
| Versão alvo | 0.8.0 |
| Arquivos afetados | `src/extension.ts`, `src/statusBar.ts` (novo), `src/state.ts`, `package.json` |

## 1. Resumo

Adicionar um indicador na status bar do VSCode que mostra o status da última
execução de testes utPLSQL (contagem de pass/fail/skipped + tempo total),
permitindo acesso rápido ao Test Explorer e ações comuns sem abrir painéis
adicionais. Extensões como Jest e Go oferecem status bar indicators com alta
adoção e feedback positivo dos usuários.

## 2. Contexto e problema

Atualmente o usuário precisa abrir o Test Explorer ou o Output Panel para saber:
- Se a última execução terminou
- Quantos testes passaram/falharam
- Se há testes em execução

Para execuções rápidas (poucos testes) o usuário pode nem abrir o Test Explorer,
mas não tem feedback visual imediato. Para execuções longas (30+ testes com
cobertura), o usuário perde a noção de progresso sem abrir o Output.

## 3. Objetivos / Não-objetivos

**Objetivos**
- Status bar item com ícone e contagem (ex: `$(testing-passed) 12/15 2.3s`)
- Tooltip expandido com detalhes (pass, fail, skip, erro, duração)
- Clique no item abre o Test Explorer
- Atualização em tempo real durante execução
- Desabilitável via setting (`utplsql.statusBar.enabled`)

**Não-objetivos**
- Gráfico de histórico/timeline (depende de PRD futuro)
- Notificações desktop (pode ser feature separada)
- Múltiplos indicadores para multi-root (consolidado em um só)

## 4. Requisitos

### RF1 — Status bar item visível ao carregar a extensão

```typescript
// src/statusBar.ts (novo)
import * as vscode from 'vscode';

export class UtplsqlStatusBar {
  private item: vscode.StatusBarItem;

  constructor() {
    this.item = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Left,
      100
    );
    this.item.command = 'utplsql.showTestExplorer';
    this.showIdle();
  }

  showIdle() {
    this.item.text = '$(beaker) utPLSQL';
    this.item.tooltip = 'No tests run yet. Click to open Test Explorer.';
    this.item.show();
  }

  showRunning(current: number, total: number) {
    this.item.text = `$(sync~spin) Running ${current}/${total} suites`;
    this.item.tooltip = `${current} of ${total} test suites executing...`;
    this.item.show();
  }

  showResults(passed: number, failed: number, skipped: number, errored: number, durationMs: number) {
    const total = passed + failed + skipped + errored;
    const icon = failed > 0 || errored > 0
      ? '$(testing-failed)'
      : '$(testing-passed)';
    const duration = (durationMs / 1000).toFixed(1);

    this.item.text = `${icon} ${passed}/${total} ${duration}s`;

    const parts: string[] = [];
    if (passed > 0) parts.push(`$(check) ${passed} passed`);
    if (failed > 0) parts.push(`$(error) ${failed} failed`);
    if (errored > 0) parts.push(`$(warning) ${errored} errored`);
    if (skipped > 0) parts.push(`$(debug-step-over) ${skipped} skipped`);
    parts.push(`$(watch) ${duration}s`);

    this.item.tooltip = parts.join('\n');
    this.item.show();
  }

  dispose() {
    this.item.dispose();
  }
}
```

### RF2 — Atualização durante execução

O status bar é atualizado em três momentos:
1. **Início da execução**: `showRunning(0, totalSuites)`
2. **Progresso**: `showRunning(currentSuite, totalSuites)` via callback `onSuiteStart`
3. **Fim da execução**: `showResults(passed, failed, skipped, errored, duration)` via `onDidEnd`

A atualização de progresso usa o mesmo callback já existente em `executeRun`.

### RF3 — Comando `utplsql.showTestExplorer`

Registrado em `package.json`, foca o Test Explorer:
```typescript
vscode.commands.registerCommand('utplsql.showTestExplorer', () => {
  vscode.commands.executeCommand('workbench.view.testing');
});
```

### RF4 — Setting `utplsql.statusBar.enabled`

```json
"utplsql.statusBar.enabled": {
  "type": "boolean",
  "default": true,
  "description": "Show test results summary in the status bar."
}
```

### RF5 — Múltiplas ações via clique direito no status bar

Adicionar context menu ao status bar item:
- "Run All Tests"
- "Run Failed Tests" (PRD-31)
- "Cancel Run"
- "Clear Results" (volta ao estado idle)

**Não-funcionais**
- RNF1 — Atualização do status bar não deve causar flickering (usar throttling de 200ms).
- RNF2 — Texto do status bar deve ser conciso (< 30 chars para não competir com outros itens).
- RNF3 — Item deve aparecer à esquerda para visibilidade máxima.

## 5. Solução proposta

### 5.1 `src/statusBar.ts`

Módulo VSCode-dependente que encapsula toda a lógica de exibição. Expõe uma
classe `UtplsqlStatusBar` com métodos públicos para cada estado.

### 5.2 Integração com `runner.ts`

Adicionar callbacks ao `executeRun`:

```typescript
// runner.ts
export async function executeRun(
  // ... parâmetros existentes ...
  onProgress?: (current: number, total: number) => void,
  onComplete?: (results: TestResults) => void,
): Promise<void>
```

O `onProgress` é chamado no início de cada suite (já existe `onSuiteStart`
internamente). O `onComplete` é chamado no `finally` do `executeRun`.

### 5.3 `extension.ts`

```typescript
const statusBar = new UtplsqlStatusBar();
context.subscriptions.push(statusBar);

// Na função de execução:
await executeRun(
  connection, pathArgs, coverage, run, leafTests, state, token,
  (current, total) => statusBar.showRunning(current, total),
  (results) => statusBar.showResults(
    results.passed, results.failed, results.skipped, results.errored,
    results.duration
  ),
);
```

## 6. Configuração

| Setting | Tipo | Default | Descrição |
|---|---|---|---|
| `utplsql.statusBar.enabled` | boolean | `true` | Exibe indicador de status dos testes na barra de status |

## 7. Plano de testes

- **Unitários** (`src/test/unit/statusBar.test.ts`):
  - Não testável diretamente (depende de `vscode.window.createStatusBarItem`).
    Testar via mock/stub.
  - Validar formatação de `showResults` para todos os cenários (só pass, só fail,
    misto, sem testes, duração zero).
- **Integração**:
  - Iniciar extensão, verificar que status bar aparece com texto idle
  - Executar testes, verificar atualização em tempo real
  - Toggle setting `utplsql.statusBar.enabled` → item some/reaparece
- **Manual**:
  - Executar suite com falhas → ícone `testing-failed` e tooltip correto
  - Executar suite 100% pass → ícone `testing-passed`
  - Clicar no item → Test Explorer abre
  - Botão direito → menu de contexto com ações

## 8. Riscos e mitigação

| Risco | Mitigação |
|---|---|
| Conflito com outros status bar items (ex.: linha de status do Git) | Alinhamento `Left` com prioridade 100; o VSCode gerencia múltiplos itens |
| Performance: atualizações muito frequentes | Throttle de 200ms entre atualizações de progresso |
| Usuário acha o texto muito longo/poluído | Concatenar em formato curto (`12/15`), detalhes no tooltip |

## 9. Rollout

- Release 0.8.0 (minor) — nova funcionalidade de UX
- Habilitado por default
- CHANGELOG: "Status bar: indicador de resultado dos testes com contagem pass/fail e duração"
- Publicar via release no GitHub

## 10. Critérios de aceite

- `npm test` passa
- Status bar visível ao carregar a extensão (texto "utPLSQL")
- Durante execução: mostra progresso "Running N/M suites"
- Após execução: mostra "✓ 12/15 2.3s" ou "✗ 8/15 3.1s"
- Tooltip lista detalhes: pass, fail, skip, erro, duração
- Clique no item abre Test Explorer
- `utplsql.statusBar.enabled: false` remove o item

## 11. Questões em aberto

- Adicionar cor ao item? VSCode permite `backgroundColor` no StatusBarItem,
  mas é limitado a temas. Melhor usar ícones semânticos.
- Mostrar status da conexão Oracle no mesmo item? (ex: ícone de DB verde/vermelho)
  — Poderia ser feature separada (Connection Health Indicator)
- Integração com PRD-31: botão direito → "Run Failed Tests" no menu de contexto
