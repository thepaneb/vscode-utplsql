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

- Registrado em `{ scheme: 'file', pattern: '**/*.pks' }` — **sem `language: 'plsql'`**
- Gera 2 CodeLenses por anotação: Run + Run with Coverage
- Comando: `utplsql.runLens` com `{ type, packageName, procName, uri, coverage }`

### Comportamento

- `%suite` → executa todas as suites do arquivo
- `%test` → executa apenas o procedimento de teste
- `.sql` (não `.pks`) → sem CodeLens
- URIs virtuais (`utplsql-db:/`) → sem CodeLens (provider registrado só para `scheme: file`)

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
- Clique no item → comando `utplsql.switchProfile`

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
| `Ctrl+Shift+U C` | Clear Connection | `utplsql:activated` |
| `Ctrl+Shift+U L` | Rerun Last | `utplsql:activated` |
| `Ctrl+Shift+U U` | Run at Cursor | `editorTextFocus && .pks` |
| `Ctrl+Shift+U X` | Run Failed | `utplsql:hasFailures` |
| `Escape` | Cancel Run | `utplsql:running` |

## Settings

| Setting | Default | Descrição |
|---|---|---|
| `utplsql.codeLens.enabled` | `true` | Habilita CodeLens |
| `utplsql.statusBar.enabled` | `true` | Habilita StatusBar |
| `utplsql.decorations.enabled` | `true` | Habilita decorações inline |
