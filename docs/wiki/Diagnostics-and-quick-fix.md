<!-- GENERATED FROM docs/brain/70-Wiki/Diagnostics-and-quick-fix.md — DO NOT EDIT -->

# Diagnostics and quick-fix

The extension provides automatic diagnostics to reduce setup friction and
accelerate the TDD cycle:

1. **Setup diagnostics** — proactive validation of connection, grants, and
   utPLSQL version, with **quick-fix actions** in the Problems Panel.
2. **Compilation diagnostics** — PL/SQL compilation errors displayed as
   underlines in the editor and in the Problems Panel.

---

## Compilation diagnostics

After a test run, the extension queries `ALL_ERRORS` for the connection schema
and publishes the compilation errors with the source **"utPLSQL Compilation"**,
mapping each error to the discovered suite (`file:line`). Errors in packages
that were not discovered in the workspace are skipped.

```
executeRunOracle() → checkCompilationErrors(ALL_ERRORS) → Problems Panel
  → editor shows underlines
```

### Configuration

```jsonc
{
  "utplsql.compilationDiagnostics.enabled": true
}
```

---

## Setup diagnostics

On extension activation, the `SetupValidator` proactively checks for
common setup issues:

| Check | Diagnostic | Severity |
|---|---|---|
| Connection failure (`resolveConnectionNoPrompt` + pool) | `UTPLSQL_BAD_CONN` | Error |
| thick client (`oracleClientMode: "thick"`) fails to init | `UTPLSQL_THICK_MODE` | Error |
| utPLSQL older than `UTPLSQL_MIN_VERSION` (3.1.0) | `UTPLSQL_OLD_VERSION` | Warning |
| Invalid objects in the utPLSQL schema | `UTPLSQL_INVALID_OBJECTS` | Warning |

> `UTPLSQL_NO_COVERAGE` still has a quick-fix handler in `quickfix.ts`, but is
> **not emitted** in the Oracle-only flow (the coverage diagnostic is not added
> during execution).

The invalid objects check (`ALL_OBJECTS` for `PACKAGE`/`TYPE`/
`PACKAGE BODY` in the utPLSQL schema) is best-effort: asynchronous, no
connection prompt, 5s timeout, and silent on failure. The
`setupDiagnostics.enabled: false` setting disables the check.

Results appear in the **Problems Panel** with source "utPLSQL Setup".

### Quick-fix actions

Each diagnostic provides a **Code Action** (lightbulb icon or `Ctrl+.`):

| Diagnostic | Quick-fix |
|---|---|
| Invalid connection (`UTPLSQL_BAD_CONN`) | **Reconfigure connection** → opens settings at `utplsql.connection` |
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
  → Compilation diagnostics: after the run, PL/SQL errors from `ALL_ERRORS`
    are published in the Problems Panel (source "utPLSQL Compilation")

After execution
  → Coverage failures are reported in the run output, not as a diagnostic
```

All diagnostics are **non-blocking** — tests run even with warnings.
Only critical errors (no connection) prevent execution.
