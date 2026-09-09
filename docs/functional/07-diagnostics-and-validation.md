# 07 — Diagnostics and Validation

Diagnósticos automáticos para erros de compilação PL/SQL e validação de
configuração do ambiente.

## Compilation Diagnostics (`src/compilationDiagnostics.ts`)

Captura erros de compilação Oracle do output do ALL_ERRORS e os exibe como
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
runner.ts: after executeRunOracle
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
4. **PLS sem ORA**: `"PLS-00123: message"` → erro com linha/coluna = 1
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
- Mensagem: `[${err.code}] ${err.message}` (o `diagnostic.code` **não** é
  populado — o código PLS vai no texto da mensagem)

## Setup Diagnostics (`src/quickfix.ts`)

Validação proativa de configuração na ativação da extensão.

### `SetupValidator`

```typescript
class SetupValidator {
  async validateOnActivation(): Promise<SetupDiagnostic[]>;
  async validateUtplsqlInstall(): Promise<SetupDiagnostic[]>;   // PRD-41
  async recompileUt3(oracledbOverride?): Promise<void>;         // PRD-41
  applyDiagnostics(diagnostics: SetupDiagnostic[]): void;
  addCoverageDiagnostic(): void;
  clear(): void;
  dispose(): void;
}
```

### Verificações

| Verificação | Condição | Diagnostic |
|---|---|---|
| Conexão | `getOracleInfo(conn)` retorna erro | `UTPLSQL_BAD_CONN` (Error) |
| Versão | `semverLt(dbVersion, '3.1.0')` | `UTPLSQL_OLD_VERSION` (Warning) |
| Instalação utPLSQL | objetos inválidos em `ALL_OBJECTS` no schema utPLSQL | `UTPLSQL_INVALID_OBJECTS` (Warning) |
| Cobertura | `coverage.xml` não gerado pós-run | `UTPLSQL_NO_COVERAGE` (Warning) |

### `validateUtplsqlInstall` (PRD-41)

Best-effort, roda junto com `validateOnActivation` na ativação:
- Gates: `setupDiagnosticsEnabled: false` → `[]`
- Conexão sem prompt (`resolveConnectionNoPrompt`); pool do PRD-38
  (`findInvalidUt3Objects` em `oracleRunner.ts`, `callTimeout` de 5s)
- Silencioso em falha (sem conexão, sem acesso a `ALL_OBJECTS`)

### `validateOnActivation`

```typescript
async validateOnActivation(): Promise<SetupDiagnostic[]>
```

1. Verifica `cfg.setupDiagnosticsEnabled` → se false, retorna `[]`
2. Conexão: `getOracleInfo(cfg, conn)` → `UTPLSQL_BAD_CONN` / `UTPLSQL_OLD_VERSION`

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

Registrado em `{ scheme: 'file', pattern: '**/*.pks' }` e também em
`{ scheme: 'utplsql-setup' }` (diagnostics de setup vivem em URI virtual
`utplsql-setup:diagnostics`). Oferece quick-fix para diagnostics com source
`"utPLSQL Setup"`:

| Diagnostic Code | Quick-fix |
|---|---|
| `UTPLSQL_BAD_CONN` | "Reconfigurar conexão" → comando `utplsql.configureConnection` |
| `UTPLSQL_NO_COVERAGE` | "Copiar grants para clipboard" → comando `utplsql.copyGrantsToClipboard` |
| `UTPLSQL_INVALID_OBJECTS` | "Recompilar UT3" → comando `utplsql.recompileUt3` (`DBMS_UTILITY.COMPILE_SCHEMA` + re-verificação) |

## Comandos auxiliares

| Comando | Descrição |
|---|---|
| `utplsql.validateSetup` | Roda `validateOnActivation` + `validateUtplsqlInstall` + `applyDiagnostics` |
| `utplsql.configureConnection` | Abre settings em `utplsql.connection` |
| `utplsql.copyGrantsToClipboard` | Copia SQL de grants para clipboard |
| `utplsql.recompileUt3` | Recompila o schema utPLSQL (interno — registrado, mas não declarado em package.json; só via quick-fix) |

## Integração

```
extension.ts activate()
    ├─► context.subscriptions.push(setupValidator)
    ├─► registerCodeActionsProvider(UtplsqlCodeActionProvider)  // scheme file + utplsql-setup
    ├─► registerCommand('utplsql.configureConnection', ...)
    ├─► registerCommand('utplsql.copyGrantsToClipboard', ...)
    ├─► registerCommand('utplsql.validateSetup', ...)
    ├─► registerCommand('utplsql.recompileUt3', ...)   // PRD-41
    └─► Promise.all([validateOnActivation(), validateUtplsqlInstall()])
            .then(([a, i]) => applyDiagnostics([...a, ...i]))

runner.ts
    ├─► compilationDiagnostics.clear()  (início do run)
    ├─► captura output Oracle → parseFromOutput → resolveFiles → apply  (após executeRunOracle)
    └─► setupValidator.addCoverageDiagnostic()  (se coverage.xml ausente)
```

## Settings

| Setting | Default | Descrição |
|---|---|---|
| `utplsql.compilationDiagnostics.enabled` | `true` | Diagnóstico de compilação PL/SQL |
| `utplsql.setupDiagnostics.enabled` | `true` | Diagnóstico de configuração |
