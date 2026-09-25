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
- `parseJUnit` visits **nested** `<testsuite>` recursively (schema › package ›
  suite — what `--%suitepath` and shared installs produce); testcases of the
  current level come before the nested ones
- `parseStackFrames`: three accepted formats —
  `at "SCHEMA.PKG"."PROC", line N` (DBMS backtrace),
  `at "SCHEMA.PKG.PROC", line N` (**what the utPLSQL reporter really emits**) and
  `at PKG.PROC, line N` (unquoted)
- `isUserFrame`: filters **per object segment** (`UT_*`, `UT$*`, `UT3_*`, `UT3$*`).
  The `UT3.` schema prefix is **not** a reason to drop a frame — a self-install
  user's own tests live in the install schema
- Reporter matching: `l.match(/^([A-Za-z0-9_]+)/)` — **sem `.trim()`**

### Result Mapping (results.ts:applyResultsFromCases)
- Match by `lastSegment(classname)` + `name`/`description`
- Fallback by name only
- Returns `Map<id, {status, message}>`
- `packageFromFrameObject` (jump to failure): 1 segment = itself, 2 = last,
  3+ = second-to-last — `resolveStackFrameToUri` compares that with
  `meta.packageName` and falls back to `<package>.pks`

## Common Failure Patterns

1. **ORA-00942 (table/view not found)**: Shared install without grants → friendly error (no CLI fallback)
2. **Coverage not generated**: Missing `EXECUTE ON DBMS_PROFILER` grant
3. **Tests show as "skipped"**: JUnit not mapping to leaf tests — check package name case
4. **Schema mode not finding suites**: Check `organization.schemaPattern` configuration
5. **"No JUnit result found" for every test**: `parseJUnit` returned nothing —
   the real cause was not reading nested `<testsuite>`. Check whether the run
   used `--%suitepath` / the suites live in another schema than utPLSQL
6. **"Go to Error" missing on a real failure**: the frame emitted by utPLSQL is
   the single qualified name (`"SCHEMA.PKG.PROC"`); if `parseStackFrames` misses
   it, `stackFrames` is undefined and no `location` is set. Also check that
   `isUserFrame` doesn't drop the user's own schema and that the comparison uses
   `packageFromFrameObject`, not the raw `objectName`

## Diagnostics

- **Compilation**: `oracleRunner.checkCompilationErrors()` queries `ALL_ERRORS`, but has no production wiring (no `DiagnosticCollection`); `utplsql.compilationDiagnostics.enabled` is read but has no effect
- **Setup**: `SetupValidator.validateOnActivation()` checks connection and version (`checkCli` is an unused stub)
- **Quick-fix**: `UtplsqlCodeActionProvider` in `**/*.pks`
