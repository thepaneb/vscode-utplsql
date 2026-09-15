# 07 — Diagnostics and Validation

Diagnósticos automáticos para erros de compilação PL/SQL e validação de
configuração do ambiente.

## Compilation Diagnostics — NÃO ATIVO hoje

> **A feature não está ativa.** O módulo `src/compilationDiagnostics.ts` foi
> removido na migração Oracle-only (PRD-64) e não existe `DiagnosticCollection`
> de compilação — nenhum diagnostic com source `"utPLSQL Compilation"` é
> criado. A setting `utplsql.compilationDiagnostics.enabled` é lida em
> `config.ts` (`compilationDiagnosticsEnabled`) e exposta no `UtConfig`, mas
> **não tem efeito**: nenhum consumidor a utiliza.

A consulta a `ALL_ERRORS` sobrevive em:

```typescript
function checkCompilationErrors(conn, schema: string): Promise<CompilationError[]>
```

Retorna `CompilationError[]` (`name`, `type`, `line`, `position`, `text`) via
`SELECT ... FROM ALL_ERRORS WHERE owner = :schema AND attribute = 'ERROR'`.
**Não tem caller de produção** — nenhum fluxo atual chama essa função; ela só é
exercitada pelos testes de unidade/integração.

PRD-68 (proposto) prevê religar a feature com um novo `DiagnosticCollection`.

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
| Versão | `parseInt(utVersion) < 3` | `UTPLSQL_OLD_VERSION` (Warning) |
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
