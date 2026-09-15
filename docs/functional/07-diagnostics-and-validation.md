# 07 — Diagnostics and Validation

Diagnósticos automáticos para erros de compilação PL/SQL e validação de
configuração do ambiente.

## Compilation Diagnostics (`src/compilationDiagnostics.ts`)

Diagnóstico de compilação PL/SQL religado na PRD-68: após um run, consulta
`ALL_ERRORS` no schema da conexão e publica no Problems Panel com source
`"utPLSQL Compilation"`, mapeando cada erro para a suite descoberta
(`file:line`). Controlado por `utplsql.compilationDiagnostics.enabled`.

```typescript
function registerCompilationDiagnostics(context): void;
function refreshCompilationDiagnostics(state): Promise<void>;  // pós-run
function clearCompilationDiagnostics(): void;
```

A consulta vive em `oracleRunner.ts`:

```typescript
function checkCompilationErrors(conn, schema: string): Promise<CompilationError[]>
```

Retorna `CompilationError[]` (`name`, `type`, `line`, `position`, `text`) via
`SELECT ... FROM ALL_ERRORS WHERE owner = :schema AND attribute = 'ERROR'`.

> Erros em packages não descobertos no workspace são ignorados (best-effort).

## Setup Diagnostics (`src/quickfix.ts`)

Validação proativa de configuração na ativação da extensão.

### `SetupValidator`

```typescript
class SetupValidator {
  async validateOnActivation(): Promise<SetupDiagnostic[]>;
  async validateUtplsqlInstall(oracledbOverride?): Promise<SetupDiagnostic[]>;  // PRD-41
  async recompileUt3(oracledbOverride?): Promise<void>;                         // PRD-41
  applyDiagnostics(diagnostics: SetupDiagnostic[]): void;
  addCoverageDiagnostic(): void;
  clear(): void;
  dispose(): void;
  checkCli(_cliPath: string): boolean;   // stub legado (sempre true, sem uso)
}
```

> `checkCli` é um stub do runner CLI removido — sempre retorna `true` e não tem
> chamador de produção.

### Verificações

| Verificação | Condição | Diagnostic |
|---|---|---|
| Conexão | falha ao conectar | `UTPLSQL_BAD_CONN` (Error) |
| Versão | `semverLt(utVersion, '3.1.0')` | `UTPLSQL_OLD_VERSION` (Warning) |
| Instalação utPLSQL | objetos inválidos em `ALL_OBJECTS` no schema utPLSQL | `UTPLSQL_INVALID_OBJECTS` (Warning) |

> `UTPLSQL_BAD_CONN` e `UTPLSQL_NO_COVERAGE` **não são produzidos** no fluxo
> atual: `validateOnActivation` não emite erro de conexão (apenas retorna `[]`)
> e `addCoverageDiagnostic` só era chamado pelo fluxo legado (CLI). Os
> quick-fixes correspondentes no `UtplsqlCodeActionProvider` permanecem
> registrados, mas nunca disparam.

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
2. Resolve conexão e chama `getOracleInfo(conn)` (sem parâmetro de config) →
   emite `UTPLSQL_OLD_VERSION` quando `parseInt(utVersion) < 3`; não emite
   diagnóstico de conexão (`UTPLSQL_BAD_CONN` não é produzido)

### `applyDiagnostics`

Cria `vscode.Diagnostic` com source `"utPLSQL Setup"`. Agrupados em URI virtual
`utplsql-setup:diagnostics`.

### `addCoverageDiagnostic`

Emite `UTPLSQL_NO_COVERAGE` no URI virtual quando `coverage.xml` não existe e
`setupDiagnosticsEnabled` é true. Só é chamado por `applyCoverage` em
`runner.ts`, um wrapper **legado** (não usado pelo fluxo Oracle-direto atual).

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

runner.ts (wrappers legados)
    └─► applyCoverage → setupValidator.addCoverageDiagnostic()  (se coverage.xml ausente)

oracleRunner.ts
    └─► checkCompilationErrors(conn, schema)  — existe, mas sem caller de produção
```

## Settings

| Setting | Default | Descrição |
|---|---|---|
| `utplsql.compilationDiagnostics.enabled` | `true` | Lida, mas **sem efeito** (feature removida) |
| `utplsql.setupDiagnostics.enabled` | `true` | Diagnóstico de configuração |
