# Diagnostics and quick-fix

The extension provides automatic diagnostics to reduce setup friction and
accelerate the TDD cycle:

1. **Setup diagnostics** — proactive validation of connection, grants, and
   utPLSQL version, with **quick-fix actions** in the Problems Panel.
2. **Compilation diagnostics** — PL/SQL compilation errors displayed as
   underlines in the editor. **Not active in the current version.**

---

## Compilation diagnostics (not active)

> ⚠️ This feature is **not wired** in the current Oracle-only version. The
> `utplsql.compilationDiagnostics.enabled` setting still exists but has **no
> effect**: no diagnostics are emitted and there is no `DiagnosticCollection`
> with source "utPLSQL Compilation". The old `src/compilationDiagnostics.ts`
> was removed in the Oracle-only migration (PRD-64); `checkCompilationErrors()`
> remains in `oracleRunner.ts` but has **no production caller**.
>
> Until it is re-enabled, compile or run the tests to surface PL/SQL errors.

### Intended flow (when re-enabled)

```
executeRun() → Oracle executes → errors parsed → Problems Panel
  → editor shows red underlines
```

### Configuration

```jsonc
{
  // Reserved. Currently has NO effect in the Oracle-only version:
  "utplsql.compilationDiagnostics.enabled": false
}
```

---

## Setup diagnostics

On extension activation, the `SetupValidator` proactively checks for
common setup issues:

| Check | Diagnostic | Severity |
|---|---|---|
| utPLSQL older than major version 3 on the database | `UTPLSQL_OLD_VERSION` | Warning |
| Invalid objects in the utPLSQL schema | `UTPLSQL_INVALID_OBJECTS` | Warning |

> The codes `UTPLSQL_BAD_CONN` and `UTPLSQL_NO_COVERAGE` still have quick-fix
> handlers in `quickfix.ts`, but **no producer** in the current code:
> `UTPLSQL_BAD_CONN` is never emitted, and the coverage diagnostic is not added
> in the Oracle-only execution flow.

The invalid objects check (`ALL_OBJECTS` for `PACKAGE`/`TYPE`/
`PACKAGE BODY` in the utPLSQL schema) is best-effort: asynchronous, no
connection prompt, 5s timeout, and silent on failure. The
`setupDiagnostics.enabled: false` setting disables the check.

Results appear in the **Problems Panel** with source "utPLSQL Setup".

### Quick-fix actions

Each diagnostic provides a **Code Action** (lightbulb icon or `Ctrl+.`):

| Diagnostic | Quick-fix |
|---|---|
| Invalid connection (`UTPLSQL_BAD_CONN`) | **Reconfigure connection** → opens settings at `utplsql.connection` (handler only — this diagnostic is not emitted today) |
| Coverage grants (`UTPLSQL_NO_COVERAGE`) | **Copy coverage grants to clipboard** → copies ready-to-paste SQL (handler only — not emitted in the Oracle flow) |
| Invalid objects in utPLSQL (`UTPLSQL_INVALID_OBJECTS`) | **Recompile UT3** → `DBMS_UTILITY.COMPILE_SCHEMA` and re-checks |

### Commands

| Command | Description |
|---|---|
| `utPLSQL: Validate configuration` | Runs full validation (setup + utPLSQL installation integrity) and shows result in Problems Panel |
| `utPLSQL: Configure connection` | Opens settings at `utplsql.connection` |
| `utPLSQL: Copy coverage grants to clipboard` | Copies `GRANT EXECUTE ON SYS.DBMS_PROFILER` **and** `GRANT EXECUTE ON SYS.DBMS_PLSQL_CODE_COVERAGE` to clipboard |

> **Recompile UT3** is not a palette command — it is a quick-fix
> (`utplsql.recompileUt3`, internal) available only in the
> `UTPLSQL_INVALID_OBJECTS` diagnostic.

### Configuration

```jsonc
{
  // Enabled by default. Disable to remove diagnostics:
  "utplsql.setupDiagnostics.enabled": false
}
```

---

## Interaction between diagnostics

The full diagnostic flow covers the entire lifecycle:

![Diagnostics lifecycle](images/diagram-diagnosticos.png)

```
Open workspace
  → Setup diagnostics: Connection OK? Version OK? utPLSQL installation intact?
  → If issues: Problems Panel + quick-fix actions

Run tests
  → Compilation diagnostics: not active in the current version

After execution
  → Coverage failures are reported in the run output, not as a diagnostic
```

All diagnostics are **non-blocking** — tests run even with warnings.
Only critical errors (no connection) prevent execution.
