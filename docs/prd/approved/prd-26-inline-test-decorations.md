# PRD-26 — Inline Test Result Decorations

| Campo | Valor |
|---|---|
| Status | Aprovado |
| Autor | Gil Cleber Barboza |
| Data | 2026-07-21 |
| Componente | Extensão `paneb.vscode-utplsql` |
| Versão alvo | 0.8.0 |
| Arquivos afetados | `src/extension.ts`, `src/decorations.ts` (novo), `src/runner.ts`, `src/state.ts`, `package.json` |

## 1. Resumo

Adicionar decorações inline de pass/fail/error no editor após cada execução de
testes, exibindo um ícone verde (pass) ou vermelho (fail) ao lado das
anotações `%suite` e `%test` no arquivo `.pks`, com a mensagem de falha como
tooltip. Extensões como Jest, Python, Go e Nexo SQL Studio oferecem feedback
inline similar — o utPLSQL hoje só mostra resultados no Test Explorer e no
Output Panel.

## 2. Contexto e problema

Após executar testes, o usuário tem que:
1. Abrir o Test Explorer para ver quais falharam
2. Clicar no teste falho para ver a mensagem de erro
3. Voltar ao editor para corrigir o código

Não há nenhum indicador visual no próprio arquivo de teste. O Nexo SQL Studio
já oferece "inline pass/fail feedback" — o usuário vê imediatamente no editor
quais testes passaram e quais falharam. Isso reduz drasticamente o ciclo de
TDD: edita → roda → vê resultado no mesmo lugar → corrige.

## 3. Objetivos / Não-objetivos

**Objetivos**
- Decoração verde (✓) nas linhas de `%suite`/`%test` que passaram
- Decoração vermelha (✗) nas linhas de `%suite`/`%test` que falharam
- Decoração amarela (⚠) para testes skipped/errored
- Tooltip com mensagem de falha ao passar o mouse
- Atualização automática após cada execução
- Desabilitável via setting (`utplsql.decorations.enabled`)

**Não-objetivos**
- Decorações em linhas que não são anotações utPLSQL
- Decorações em arquivos `.pkb`
- Decorações de cobertura (já implementado via Coverage API)
- Animação ou transições (só atualização direta)

## 4. Requisitos

### RF1 — Tipos de decoração

```typescript
// src/decorations.ts (novo)
import * as vscode from 'vscode';

const passedDecoration = vscode.window.createTextEditorDecorationType({
  gutterIconPath: new vscode.ThemeIcon('testing-passed'),
  gutterIconSize: 'contain',
  overviewRulerColor: new vscode.ThemeColor('testing.iconPassed'),
  overviewRulerLane: vscode.OverviewRulerLane.Right,
  isWholeLine: true,
});

const failedDecoration = vscode.window.createTextEditorDecorationType({
  gutterIconPath: new vscode.ThemeIcon('testing-failed'),
  gutterIconSize: 'contain',
  overviewRulerColor: new vscode.ThemeColor('testing.iconFailed'),
  overviewRulerLane: vscode.OverviewRulerLane.Right,
  isWholeLine: true,
});

const skippedDecoration = vscode.window.createTextEditorDecorationType({
  gutterIconPath: new vscode.ThemeIcon('testing-skipped'),
  gutterIconSize: 'contain',
  overviewRulerColor: new vscode.ThemeIcon('testing.iconSkipped'),
  overviewRulerLane: vscode.OverviewRulerLane.Right,
  isWholeLine: true,
});

const erroredDecoration = vscode.window.createTextEditorDecorationType({
  gutterIconPath: new vscode.ThemeIcon('testing-error'),
  gutterIconSize: 'contain',
  overviewRulerColor: new vscode.ThemeColor('testing.iconErrored'),
  overviewRulerLane: vscode.OverviewRulerLane.Right,
  isWholeLine: true,
});
```

### RF2 — Mapeamento resultado → linha

Após `applyResults`, o runner retorna um mapa de `TestItem.id → { status, message }`.
O `decorations.ts` usa esse mapa + os metadados (`ItemMeta`) para localizar
a linha correta no arquivo `.pks`.

```typescript
interface TestLineResult {
  uri: vscode.Uri;
  line: number;
  status: 'passed' | 'failed' | 'skipped' | 'errored';
  message?: string;
}

function mapResultsToLines(
  results: Map<string, TestLineResult>,
  state: TestStateManager,
): Map<vscode.Uri, TestLineResult[]> {
  // Para cada resultado, obtém o ItemMeta para achar URI + linha
  // Agrupa por URI para aplicar decorations por editor
}
```

### RF3 — Aplicação das decorações

```typescript
export function applyDecorations(
  resultsByUri: Map<vscode.Uri, TestLineResult[]>,
  editor: vscode.TextEditor,
) {
  const uri = editor.document.uri.toString();
  const results = resultsByUri.get(uri);
  if (!results) {
    clearDecorations(editor);
    return;
  }

  const passed: vscode.DecorationOptions[] = [];
  const failed: vscode.DecorationOptions[] = [];
  const skipped: vscode.DecorationOptions[] = [];
  const errored: vscode.DecorationOptions[] = [];

  for (const result of results) {
    const range = new vscode.Range(result.line, 0, result.line, 0);
    const hoverMessage = result.message ? new vscode.MarkdownString(result.message) : undefined;

    const options: vscode.DecorationOptions = { range, hoverMessage };

    switch (result.status) {
      case 'passed': passed.push(options); break;
      case 'failed': failed.push(options); break;
      case 'skipped': skipped.push(options); break;
      case 'errored': errored.push(options); break;
    }
  }

  editor.setDecorations(passedDecoration, passed);
  editor.setDecorations(failedDecoration, failed);
  editor.setDecorations(skippedDecoration, skipped);
  editor.setDecorations(erroredDecoration, errored);
}
```

### RF4 — Limpeza entre execuções

Ao iniciar uma nova execução (`executeRun`), limpar todas as decorações do
editor ativo para evitar resultados stale.

### RF5 — Setting `utplsql.decorations.enabled`

```json
"utplsql.decorations.enabled": {
  "type": "boolean",
  "default": true,
  "description": "Show pass/fail decorations on %suite and %test lines after test execution."
}
```

**Não-funcionais**
- RNF1 — Decorações usam ícones nativos do tema (`testing-passed`, etc.),
  garantindo consistência visual.
- RNF2 — Aplicar decorações apenas no editor ativo e em editores visíveis
  (evitar processar documentos não visíveis).
- RNF3 — Resultados são cacheados no `TestStateManager` para reaplicação
  quando o usuário troca de aba.

## 5. Solução proposta

### 5.1 `src/decorations.ts` (novo módulo vscode-dependente)

```typescript
export class DecorationManager {
  private results: Map<string, TestLineResult[]> = new Map();

  constructor(private state: TestStateManager) {}

  updateResults(runResults: Map<string, { status: string; message?: string }>) {
    this.results = mapResultsToLines(runResults, this.state);
    this.applyToVisibleEditors();
  }

  clear() {
    this.results.clear();
    this.applyToVisibleEditors();
  }

  private applyToVisibleEditors() {
    for (const editor of vscode.window.visibleTextEditors) {
      if (editor.document.uri.path.endsWith('.pks')) {
        applyDecorations(this.results, editor);
      }
    }
  }
}
```

### 5.2 Integração com `runner.ts`

Após `applyResults`, gerar o mapa de `TestItem.id → { status, message }` e
chamar `decorationManager.updateResults(results)`.

### 5.3 Reaplicação no `onDidChangeActiveTextEditor`

```typescript
context.subscriptions.push(
  vscode.window.onDidChangeActiveTextEditor((editor) => {
    if (editor && decorationManager.hasResults()) {
      decorationManager.applyToEditor(editor);
    }
  })
);
```

### 5.4 Colaboração com PRD-24 (CodeLens)

As decorações complementam o CodeLens: o CodeLens oferece a ação (executar),
as decorações mostram o resultado (status). Ambos compartilham a mesma
informação de localização (linha da anotação).

## 6. Configuração

| Setting | Tipo | Default | Descrição |
|---|---|---|---|
| `utplsql.decorations.enabled` | boolean | `true` | Exibe decorações de pass/fail nas linhas `%suite` e `%test` após execução |

## 7. Plano de testes

- **Unitários** (`src/test/unit/decorations.test.ts`):
  - Testar `mapResultsToLines` com dados mockados de `TestItem` + `ItemMeta`
  - Validar agrupamento por URI
  - Validar status mapping (passed, failed, skipped, errored)
- **Integração**:
  - Executar suite com pass/fail misto → verificar decorações no editor
  - Trocar de aba e voltar → decorações reaparecem
  - Nova execução → decorações antigas limpam antes das novas
  - Toggle setting → decorações somem
- **Manual**:
  - Suite 100% pass → apenas ícones verdes
  - Suite com falha → ícone vermelho + tooltip com mensagem
  - Overview ruler → marcadores de posição visíveis

## 8. Riscos e mitigação

| Risco | Mitigação |
|---|---|
| Mapeamento resultado→linha impreciso (linha do `%test` vs procedure) | Usar a linha do `%test` (já armazenada no `ItemMeta.range`), não da procedure |
| Decorações poluem o editor com muitos ícones | Apenas anotações `%suite`/`%test` recebem decoração; ignorar procedures e comentários |
| Decorações são perdidas ao fechar/reabrir o editor | Cache no `DecorationManager.results`; reaplicar no `onDidChangeActiveTextEditor` |
| Tema escuro/claro incompatível com cores hardcoded | Usar `ThemeIcon` e `ThemeColor` nativos do VSCode |

## 9. Rollout

- Release 0.8.0 (minor)
- Habilitado por default
- CHANGELOG: "Inline decorations: ícones pass/fail no editor após execução de testes"
- Publicar via release no GitHub

## 10. Critérios de aceite

- `npm test` passa
- Decorações aparecem no editor após execução de testes
- Ícone verde para passed, vermelho para failed, amarelo para skipped/errored
- Tooltip com mensagem de falha ao passar mouse sobre ícone vermelho
- Decorações somem ao iniciar nova execução
- Decorações reaparecem ao trocar de aba e voltar
- Overview ruler mostra marcadores de posição
- `utplsql.decorations.enabled: false` desabilita tudo

## 11. Questões em aberto

- Deve-se mostrar decoração no `%suite` quando algum `%test` interno falhou?
  (agregação: suite status = pior caso dos filhos). Recomendação: sim.
- Como tratar suites com filhos mistos (pass + fail)?
  — Ícone de warning (⚠) com tooltip "2/5 tests failed"
- Interação com PRD-29 (Jump to failure): clique na decoração → navega para
  a linha da falha no `.pkb`?
