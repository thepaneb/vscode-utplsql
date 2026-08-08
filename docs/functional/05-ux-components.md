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

Usa o mesmo parser de `parseSuiteText` (veja [01 — Discovery](01-test-discovery.md)).
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
- Reset ao trocar de editor ativo

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
- `showIdle()` — estado inicial: `$(beaker) utPLSQL`
- `showRunning(current, total)` — progresso: `$(sync~spin) Running N/M suites` (throttle 200ms)
- `showResults(passed, failed, skipped, errored, durationMs)` — resultado final
- `dispose()` — limpeza

Respeita `utplsql.statusBar.enabled` (se `false`, métodos são no-op).

### Integração

- `extension.ts`: instanciado no `activate()`, registrado em `context.subscriptions`
- `runner.ts`: `onSuiteStart` → `showRunning`, `onComplete` → `showResults`
- Clique no item → comando `utplsql.showTestExplorer`

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
runner.ts: after executeRun
    │
    └─► decorationManager.update(state.getLastResults(), controller)
            │
            ├─► se !decorationsEnabled → return
            ├─► itera resultMap: para cada [id, {status, message}]
            │       └─► findTestItem(controller, id) → item.range.start.line
            ├─► agrupa por URI → Map<uri, LineEntry[]>
            └─► applyToVisibleEditors()
                    └─► para cada editor visível:
                            ├─► agrupa entries por status
                            └─► editor.setDecorations(type, options[])
```

### `findTestItem`

```typescript
function findTestItem(controller, id: string): TestItem | undefined
```

Busca recursiva: primeiro `controller.items.get(id)`, depois `suite.children`.
Suporta tanto suite-level quanto test-level IDs.

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
