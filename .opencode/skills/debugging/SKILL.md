---
name: debugging
description: Systematic debugging approach for this VSCode utPLSQL extension. Multi-component debugging — VSCode Extension Host, Oracle DB, node-oracledb.
compatibility: opencode
---

# Debugging Guide

## Debugging the Extension

Press **F5** (`.vscode/launch.json`) to open Extension Development Host.

## Multi-Component Debugging

This project bridges multiple systems. When debugging failures, identify the component:

### Oracle Direct Runner (oracleRunner.ts)
- Check `oracledb` import — Thin mode is default (no Instant Client needed)
- Check `UT_OUTPUT_BUFFER_TMP` — polling every 200ms, may miss early output
- Check `conn.break()` for cancellation
- Ensure `GRANT EXECUTE ON DBMS_PROFILER` for coverage
- Check `ALL_SYNONYMS` access for shared install prefix

### Test Discovery (discovery.ts + suiteParser.ts)
- Verify `.pks` files contain `%suite` and `%test` annotations
- In schema-mode, verify path pattern matches `{schema}` placeholder

### JUnit Parsing (junit.ts)
- `parseStackFrames`: regex for quoted `"SCHEMA.PKG"."PROC", line N`
- `isUserFrame`: filters UT_*, UT$*, UT3_*, UT3$*, UT3.* prefixes
- Reporter matching: `l.match(/^([A-Za-z0-9_]+)/)` — **sem `.trim()`**

### Result Mapping (results.ts:applyResultsFromCases)
- Match by `lastSegment(classname)` + `name`/`description`
- Fallback by name only
- Returns `Map<id, {status, message}>`

## Common Failure Patterns

1. **ORA-00942 (table/view not found)**: Shared install without grants → friendly error (no CLI fallback)
2. **Coverage not generated**: Missing `EXECUTE ON DBMS_PROFILER` grant
3. **Tests show as "skipped"**: JUnit not mapping to leaf tests — check package name case
4. **Schema mode not finding suites**: Check `organization.schemaPattern` configuration

## Diagnostics

- **Compilation**: `oracleRunner.checkCompilationErrors()` queries `ALL_ERRORS`, but has no production wiring (no `DiagnosticCollection`); `utplsql.compilationDiagnostics.enabled` is read but has no effect
- **Setup**: `SetupValidator.validateOnActivation()` checks connection and version (`checkCli` is an unused stub)
- **Quick-fix**: `UtplsqlCodeActionProvider` in `**/*.pks`
