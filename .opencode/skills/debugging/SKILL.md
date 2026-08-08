---
name: debugging
description: Systematic debugging approach for this VSCode utPLSQL extension. Multi-component debugging — VSCode Extension Host, Oracle DB, utPLSQL CLI, node-oracledb.
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

### CLI Runner (runner.ts + cli.ts)
- Check Java availability (`java` in PATH)
- Check utPLSQL-cli version compatibility
- Check temp directory permissions
- Check `stderr` for compilation errors (captured as `compilerOutput`)

### Test Discovery (discovery.ts + suiteParser.ts)
- Verify `.pks` files contain `%suite` and `%test` annotations
- In schema-mode, verify path pattern matches `{schema}` placeholder

### JUnit Parsing (junit.ts)
- `parseStackFrames`: regex for quoted `"SCHEMA.PKG"."PROC", line N`
- `isUserFrame`: filters UT_*, UT$*, UT3_*, UT3$*, UT3.* prefixes
- Reporter matching: `l.match(/^([A-Za-z0-9_]+)/)` — **sem `.trim()`**

### Result Mapping (runner.ts:applyResults)
- Match by `lastSegment(classname)` + `name`/`description`
- Fallback by name only
- Returns `Map<id, {status, message}>`

## Common Failure Patterns

1. **ORA-00942 (table/view not found)**: Shared install without grants → fallback CLI
2. **Coverage not generated**: Missing `EXECUTE ON DBMS_PROFILER` grant
3. **Tests show as "skipped"**: JUnit not mapping to leaf tests — check package name case
4. **Schema mode not finding suites**: Check `organization.schemaPattern` configuration
5. **CLI fails silently**: Check Java/CLI path, temp dir, connection string

## Diagnostics

- **Compilation**: `compilationDiagnostics.ts` reads from runner's `compilerOutput` (stdout + stderr)
- **Setup**: `SetupValidator.validateOnActivation()` checks CLI, Java, connection, version
- **Quick-fix**: `UtplsqlCodeActionProvider` in `**/*.pks`
