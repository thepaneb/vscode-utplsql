---
tipo: funcional
status: ativo
numero: 05
titulo: "05 — UX Components"
publicar: docs/functional/05-ux-components.md
verificado: 2026-09-23
regras: ["BR-UI-001", "BR-UI-002", "BR-UI-003", "BR-UI-004", "BR-UI-005", "BR-UI-006", "BR-UI-013", "BR-UI-016", "BR-PARSE-015", "BR-PARSE-019"]
tags: [funcional]
---
# 05 — UX Components

Componentes de interface: CodeLens, StatusBar, Decorações inline, Keybindings.

## CodeLens (`src/codelens.ts`)

Botões **Run** e **Run with Coverage** sobre `%suite` e `%test` no editor.

### `parseCodeLensItems` (puro)

```typescript
function parseCodeLensItems(text: string): CodeLensItem[]

interface CodeLensItem {
  type: 'suite' | 'test';
  packageName: string;
  description: string;
  procName?: string;
  line: number;
}
```

Parser **próprio** em `codelens.ts` (regexes independentes de `suiteParser.ts`,
comportamento equivalente para `%suite`/`%test`).
Exportado para reuso por CodeLens, Decorations e Run at Cursor.

### `UtplsqlCodeLensProvider` (vscode)

```typescript
class UtplsqlCodeLensProvider implements vscode.CodeLensProvider
```

- Registrado com um seletor que combina `**/*.pks` (canônico), os globs de
  `discovery.languageIds` + `files.associations` e os language IDs configurados
  (default `plsql`, `sql`, `oracle-sql`) — PRD-109
- Um documento que casa com glob **e** language ID recebe **um único** conjunto
  de lenses (provider registrado uma vez)
- Gera 2 CodeLenses por anotação: Run + Run with Coverage
- Comando: `utplsql.runLens` com `{ type, packageName, procName, uri, coverage }`

### Comportamento

- `%suite` → executa todas as suites do arquivo
- `%test` → executa apenas o procedimento de teste
- `.pks`, `.pls`, `.plb`, `.tps`, `.tpb`, `.vw` e extensões associadas → CodeLens
  quando o arquivo está na identidade PL/SQL
- Arquivo fora da identidade → sem CodeLens
- URIs virtuais (`utplsql-db:/`) → sem CodeLens (provider registrado só para `scheme: file`)

## Snippets (`snippets/utplsql.code-snippets`)

Biblioteca registrada em `contributes.snippets` para `sql` e `plsql`
(`oracle-sql` fica só na identidade de descoberta/CodeLens; registrar snippets
para um ID não contribuído gera warning no VS Code):

- `ut-suite` — esqueleto completo do package de teste;
- annotations: `%suite`, `%suitepath`, `%test`, `%context`/`%endcontext`,
  `%name`, `%beforeall`/`%afterall`, `%beforeeach`/`%aftereach`,
  `%beforetest`/`%aftertest`, `%disabled`, `%tags`, `%rollback`, `%throws`,
  `%displayname`;
- matchers: `to_equal`, `to_be_*`, `to_match`, `to_be_like`, `to_contain`,
  `to_have_count`, cursor com modifiers, JSON e `ut-fail`;
- `ut-nls-cursor` com `ut.set_nls` → `to_equal` → `ut.reset_nls` (evita
  `ORA-01861` em `DATE`).

O JSON é validado por `src/test/unit/snippets.test.ts` (prefixos obrigatórios,
`body` não vazio, matchers do RF2 e registro no `package.json`).

## StatusBar (`src/statusBar.ts`)

Indicador na barra de status com contagem de resultados e progresso.

### `formatResults` (puro)

```typescript
function formatResults(passed, failed, skipped, errored, durationMs): StatusBarFormat
```

- Ícone: `$(testing-passed)` ou `$(testing-failed)`
- Texto: `$(icon) passed/total X.Xs`
- Tooltip: lista de `passed`, `failed`, `errored`, `skipped` + duração

### `UtplsqlStatusBar` (vscode)

```typescript
class UtplsqlStatusBar implements vscode.Disposable
```

Métodos:
- `showIdle()` — estado inicial: `$(beaker) utPLSQL`; com perfil ativo: `$(database) <perfil>`
- `showRunning(current, total)` — progresso: `$(sync~spin) Running N/M suites` (throttle 200ms)
- `showResults(passed, failed, skipped, errored, durationMs)` — resultado final
- `dispose()` — limpeza

Respeita `utplsql.statusBar.enabled` (se `false`, métodos são no-op).

### Integração

- `extension.ts`: instanciado no `activate()`, registrado em `context.subscriptions`
- `extension.ts` `runWithProgress`: `onSuiteStart` → `showRunning`, `onComplete` →
  `showResults` (callbacks repassados a `executeRun`)
- Clique no item → comando `utplsql.switchProfile`; o item também carrega o
  **toggle de cobertura** (`utPLSQL: Toggle Coverage`, `Ctrl+Shift+U Shift+C`),
  que alterna o modo de cobertura da sessão (PRD-54)
- A **duração** do último run é persistida (`TestStateManager`) e reaproveitada no
  reload; `utplsql.showTestDuration` ecoa `(1.2s)` no label dos itens (PRD-56)

## Decorações inline (`src/decorations.ts`)

Ícones ✓/✗/⚠ no editor após execução, na linha do `%suite`/`%test`.

### `DecorationManager`

```typescript
class DecorationManager implements vscode.Disposable
```

4 tipos de decoração (módulo-level, criadas uma vez):
- `passedDecoration` — ✓ verde (`testing.iconPassed`)
- `failedDecoration` — ✗ vermelho (`testing.iconFailed`)
- `skippedDecoration` — ⚠ amarelo (`testing.iconSkipped`)
- `erroredDecoration` — ⚠ amarelo (`testing.iconErrored`)

### Fluxo

```
commands/run.ts (pós-run)
    │
    └─► decorationManager.update(state.getLastResults(), (id) => state.getItem(id))
            │
            ├─► se !decorationsEnabled → return
            ├─► itera resultMap: para cada [id, {status, message}]
            │       └─► resolveItem(id) → item.range.start.line
            ├─► agrupa por URI → Map<uri, LineEntry[]>
            └─► applyToVisibleEditors()
                    └─► para cada editor visível:
                            ├─► agrupa entries por status
                            └─► editor.setDecorations(type, options[])
```

### `resolveItem`

`update()` recebe um callback `resolveItem(id)`; o caller passa
`(id) => state.getItem(id)` (mapa `state.itemMap`). Como o `itemMap` é populado
com todos os itens, independente da profundidade, funciona tanto no modo `file`
quanto no modo `schema` — não depende mais de navegar `controller.items`.

### Outros métodos

- `clear()` — limpa as decorações
- `hasResults()` — indica se há resultados decorados
- `dispose()` — descarta os 4 tipos de decoração

### Hover

`DecorationOptions.hoverMessage` com `MarkdownString` da mensagem de falha.

### Diff esperado × obtido (PRD-52)

Em falha de asserção, o item do teste no Test Explorer abre o **diff nativo** do
VSCode com os valores *Expected* / *Actual* extraídos da mensagem do reporter
(`expected`/`actual` / `Expected:`/`Actual:`), com fallback para a mensagem crua
quando o par não é reconhecido.

## Keybindings

Registrados em `package.json` → `contributes.keybindings`.

Prefixo: `Ctrl+Shift+U` (Mac: `Cmd+Shift+U`).

| Atalho | Comando | When |
|---|---|---|
| `Ctrl+Shift+U R` | Run All | `utplsql:connected` |
| `Ctrl+Shift+U T` | Run File | `editorTextFocus && .pks/.pkb && connected` |
| `Ctrl+Shift+U Shift+T` | Run File + Coverage | idem |
| `Ctrl+Shift+U F` | Refresh | `utplsql:activated` |
| `Ctrl+Shift+U I` | Show Info | `utplsql:activated` |
| `Ctrl+Shift+U C` | Clear session connection | `utplsql:activated` |
| `Ctrl+Shift+U L` | Rerun Last | `utplsql:activated` |
| `Ctrl+Shift+U U` | Run at Cursor | `editorTextFocus && .pks` |
| `Ctrl+Shift+U X` | Run Failed | `utplsql:hasFailures` |
| `Ctrl+Shift+U Shift+C` | Toggle Coverage | `utplsql:activated` |
| `Ctrl+Shift+U Shift+R` | Run Related Tests | `editorTextFocus && utplsql:connected` |
| `Ctrl+Shift+U D` | Debug at Cursor | `editorTextFocus && .pks` |
| `Ctrl+Shift+U Shift+D` | Debug Failed Tests | `utplsql:hasFailures` |
| `Escape` | Cancel Run | `utplsql:running` |

## Settings

| Setting | Default | Descrição |
|---|---|---|
| `utplsql.codeLens.enabled` | `true` | Habilita CodeLens |
| `utplsql.statusBar.enabled` | `true` | Habilita StatusBar |
| `utplsql.decorations.enabled` | `true` | Habilita decorações inline |

## Conexões

<!-- brain:auto:start:conexoes -->
- 📐 Regras: [[BR-UI-001 - Context key utplsql-activated é setado na ativação|BR-UI-001]] · [[BR-UI-002 - utplsql-running liga no início e desliga em todos os caminhos de saída|BR-UI-002]] · [[BR-UI-003 - utplsql-connected reflete a resolução de conexão sem prompt|BR-UI-003]] · [[BR-UI-004 - utplsql-hasFailures derivado de lastFailedItems (failed ou error)|BR-UI-004]] · [[BR-UI-005 - Status bar - gating por setting, throttle de 200ms e ícone por falha-erro|BR-UI-005]] · [[BR-UI-006 - CodeLens usa glob canonico e languageIds sem duplicar|BR-UI-006]] · [[BR-UI-013 - Integracao nativa ao Test Explorer via a API de testes do VS Code|BR-UI-013]] · [[BR-UI-016 - Snippets espelham annotations e matchers com JSON validado|BR-UI-016]] · [[BR-PARSE-015 - CodeLens gera dois lenses por annotation, na linha da annotation|BR-PARSE-015]] · [[BR-PARSE-019 - Descoberta e CodeLens respeitam discovery.languageIds e files.associations|BR-PARSE-019]]
- ↩️ Referenciada por: [[Editor-integration]]
<!-- brain:auto:end -->
