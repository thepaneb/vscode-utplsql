# 07 — Diagnostics and Validation

Diagnósticos automáticos para erros de compilação PL/SQL e validação de
configuração do ambiente.

## Compilation Diagnostics (`src/compilationDiagnostics.ts`)

Captura erros de compilação Oracle do output do CLI e os exibe como
`vscode.Diagnostic` no editor.

### `CompilationDiagnostics`

```typescript
class CompilationDiagnostics {
  parseFromOutput(output: string): CompilationError[];
  resolveFiles(errors: CompilationError[], state: TestStateManager): void;
  apply(errors: CompilationError[]): void;
  clear(): void;
  dispose(): void;
}
```

### Fluxo

```
runner.ts: after runCli
    │
    ├─► compilerOutput += chunk (callback onStdout)
    ├─► compilerOutput += result.stderr
    │
    └─► if cfg.compilationDiagnosticsEnabled && compilerOutput
            │
            ├─► parseFromOutput(compilerOutput) → CompilationError[]
            │       │
            │       ├─► detecta "Package X compiled with errors"
            │       ├─► detecta "ORA-06550: line N, column M:"
            │       └─► detecta "PLS-NNNNN: message"
            │
            ├─► resolveFiles(errors, state)
            │       └─► associa erros a URIs de .pks/.pkb no workspace
            │
            └─► apply(errors)
                    └─► vscode.Diagnostic no Problems Panel (source: "utPLSQL Compilation")
```

### `parseFromOutput`

Máquina de estados que processa o output linha a linha:

1. **Objeto atual**: `"Package APP compiled with errors"` → `currentObj = { name: 'app' }`
2. **Linha ORA**: `"ORA-06550: line 12, column 5:"` → `pendingOra = { line: 12, col: 5 }`
3. **Linha PLS**: `"PLS-00201: identifier X must be declared"` → combina com `pendingOra`
4. **PLA sem ORA**: `"PLS-00123: message"` → erro com linha/coluna = 1
5. **Fallback**: ao final, se `pendingPls` sem `pendingOra`, usa linha/coluna = 1

### `resolveFiles`

```typescript
function resolveFiles(errors, state): void
```

- Itera `state.cachedItems` → obtém `meta.uri.fsPath`
- Extrai `baseName` do caminho (remove `.pks`/`.pkb`)
- Se mensagem contém "body" ou "package body" → prefere `.pkb`
- Caso contrário → prefere `.pks`
- Se `workspaceFolders` é undefined → no-op (diagnostics sem URI)

### `apply`

Agrupa erros por URI e cria `vscode.Diagnostic` com:
- Range: `(line-1, col-1)` até `(line-1, 999)`
- Severity: `Error`
- Source: `"utPLSQL Compilation"`
- Code: código PLS (ex: `PLS-00201`)

## Setup Diagnostics (`src/quickfix.ts`)

Validação proativa de configuração na ativação da extensão.

### `SetupValidator`

```typescript
class SetupValidator {
  async validateOnActivation(): Promise<SetupDiagnostic[]>;
  checkCli(cliPath: string): boolean;
  applyDiagnostics(diagnostics: SetupDiagnostic[]): void;
  addCoverageDiagnostic(): void;
  clear(): void;
  dispose(): void;
}
```

### Verificações

| Verificação | Condição | Diagnostic |
|---|---|---|
| CLI | `fs.accessSync(cliPath, X_OK)` falha | `UTPLSQL_NO_CLI` (Error) |
| Java | Modo `java` + `javaPath` não executável | `UTPLSQL_NO_JAVA` (Error) |
| Conexão | `getCliInfo(cfg, conn)` retorna erro | `UTPLSQL_BAD_CONN` (Error) |
| Versão | `semverLt(dbVersion, '3.1.0')` | `UTPLSQL_OLD_VERSION` (Warning) |
| Cobertura | `coverage.xml` não gerado pós-run | `UTPLSQL_NO_COVERAGE` (Warning) |

### `validateOnActivation`

```typescript
async validateOnActivation(): Promise<SetupDiagnostic[]>
```

1. Verifica `cfg.setupDiagnosticsEnabled` → se false, retorna `[]`
2. `checkCli(cfg.cliPath)` → `UTPLSQL_NO_CLI`
3. Modo java: `fs.accessSync(javaPath, X_OK)` → `UTPLSQL_NO_JAVA`
4. Se CLI existe + conexão configurada: `getCliInfo(cfg, conn)` → `UTPLSQL_BAD_CONN` / `UTPLSQL_OLD_VERSION`

### `applyDiagnostics`

Cria `vscode.Diagnostic` com source `"utPLSQL Setup"`. Agrupados em URI virtual
`utplsql-setup:diagnostics`.

### `addCoverageDiagnostic`

Chamado após `applyCoverage` quando `coverage.xml` não existe. Só se
`setupDiagnosticsEnabled` for true.

## Code Actions (`UtplsqlCodeActionProvider`)

```typescript
class UtplsqlCodeActionProvider implements vscode.CodeActionProvider
```

Registrado em `{ scheme: 'file', pattern: '**/*.pks' }`. Oferece quick-fix para
diagnostics com source `"utPLSQL Setup"`:

| Diagnostic Code | Quick-fix |
|---|---|
| `UTPLSQL_NO_CLI` | "Configurar utplsql.cliPath" → abre settings |
| `UTPLSQL_BAD_CONN` | "Reconfigurar conexão" → comando `utplsql.configureConnection` |
| `UTPLSQL_NO_COVERAGE` | "Copiar grants para clipboard" → comando `utplsql.copyGrantsToClipboard` |

## Comandos auxiliares

| Comando | Descrição |
|---|---|
| `utplsql.validateSetup` | Roda `validateOnActivation` + `applyDiagnostics` |
| `utplsql.configureConnection` | Abre settings em `utplsql.connection` |
| `utplsql.copyGrantsToClipboard` | Copia SQL de grants para clipboard |

## Integração

```
extension.ts activate()
    ├─► context.subscriptions.push(setupValidator)
    ├─► registerCodeActionsProvider(UtplsqlCodeActionProvider)
    ├─► registerCommand('utplsql.configureConnection', ...)
    ├─► registerCommand('utplsql.copyGrantsToClipboard', ...)
    ├─► registerCommand('utplsql.validateSetup', ...)
    └─► setupValidator.validateOnActivation().then(applyDiagnostics)

runner.ts
    ├─► compilationDiagnostics.clear()  (início do run)
    ├─► captura output CLI → parseAndApply  (após runCli)
    └─► setupValidator.addCoverageDiagnostic()  (se coverage.xml ausente)
```

## Settings

| Setting | Default | Descrição |
|---|---|---|
| `utplsql.compilationDiagnostics.enabled` | `true` | Diagnóstico de compilação PL/SQL |
| `utplsql.setupDiagnostics.enabled` | `true` | Diagnóstico de configuração |
