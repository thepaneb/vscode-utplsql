# Troubleshooting

Common issues and their solutions.

<!-- Screenshots of symptoms will be added as needed in each section -->

## Suites not appearing

**Symptom:** The Testing view is empty, no suites listed.

**Likely cause:** `utplsql.includePatterns` does not cover your test files.

**Solution:** Adjust the glob pattern. Examples:

```jsonc
// If your tests are in .sql files (not .pks)
"utplsql.includePatterns": ["**/*.sql"]

// If you want to include .pkb as well
"utplsql.includePatterns": ["**/*.pks", "**/*.pkb"]
```

Use `utPLSQL: Refresh Tests` (palette) to force rediscovery.
For automatic diagnostics, run `utPLSQL: Validate Configuration`.

---

## Compilation errors not showing in the editor

**Symptom:** Tests fail with a compilation error, but the editor does not show
squiggly underlines.

**Solution:** Check if `utplsql.compilationDiagnostics.enabled` is `true`
(default). If it is disabled, re-enable it:

```jsonc
"utplsql.compilationDiagnostics.enabled": true
```

---

## Empty coverage (0%)

**Symptom:** Tests pass, but coverage shows 0% across all files.

**Cause 1:** Missing `GRANT EXECUTE ON DBMS_PROFILER`.

**Solution:** Run as DBA:
```sql
GRANT EXECUTE ON SYS.DBMS_PROFILER TO <schema>;
GRANT EXECUTE ON SYS.DBMS_PLSQL_CODE_COVERAGE TO <schema>;
```

**Cause 2:** The `UT_COVERAGE_COBERTURA_REPORTER` reporter does not exist in the
database (outdated utPLSQL).

**Solution:** Update utPLSQL on the database. Use `utPLSQL: Show Information`
to verify the version.

**Cause 3:** The regex in `coverageSourceArgs` does not match file names.

**Solution:** Check the mapped file names in the extension's Log Output
(channel `utPLSQL`). Adjust the regex in `coverageSourceArgs`.

---

## Timeout during execution

**Symptom:** Execution is interrupted before completing, with a timeout message.

**Cause:** Tests take longer than `utplsql.timeoutMinutes` (default 60 min).

**Solution:** Increase the timeout:

```jsonc
"utplsql.timeoutMinutes": 120
```

---

## Connection error

**Symptom:** "Connection failed", "ORA-12154", or "Could not resolve
service name".

**Cause:** Malformed connection string, database unreachable, or TNS not
configured.

**Solution:**
1. Use `utPLSQL: Show Information` to validate the connection directly
2. Check the format:
   - EZ Connect: `user/pass@//host:port/service` (note the **double** slash)
   - TNS: `user/pass@tns_alias` (requires `TNS_ADMIN` and `tnsnames.ora`)
3. Test connectivity with `tnsping` or `sqlplus`

---

## `%suite` not recognized

**Symptom:** The package exists but does not appear as a suite in the Test Explorer.

**Likely causes:** The file does not have `%suite` **and** the `create [or replace] package`
declaration (both are required by the parser); or no `%test` is associated with a procedure.

The parser is token-driven — there is **no** blank-line requirement:

```sql
create or replace package test_foo as
  -- %suite(Foo)
  -- %test(bar)
  procedure bar;
end;
```

Also verify that the file is covered by `utplsql.includePatterns` and run
`utPLSQL: Refresh Tests`.

---

## CodeLens not appearing

**Symptom:** Run/Run with Coverage buttons do not appear above `%suite` and
`%test` in `.pks` files.

**Cause 1:** `utplsql.codeLens.enabled` is disabled.

**Solution:** Check in `settings.json`:
```jsonc
"utplsql.codeLens.enabled": true  // default is true
```

**Cause 2:** `editor.codeLens` is disabled in VS Code.

**Solution:** Enable it:
```jsonc
"editor.codeLens": true
```

---

## Keyboard shortcuts not working

**Symptom:** Shortcuts with the `Ctrl+Shift+U` prefix do not perform the
expected action, or they trigger a command from another extension.

**Cause:** Conflict with another extension or a VS Code shortcut.

**Solution:** Go to File → Preferences → Keyboard Shortcuts, search for `utplsql`,
and reassign the keys as needed.

---

## Direct Oracle does not connect

**Symptom:** `runnerMode: oracle` fails with "oracledb not available" or a
connection error.

**Cause 1:** `node-oracledb` is not available (only occurs during development —
the VSIX already includes the thin driver).

**Solution:** Install the optional dependency in your dev environment:
```bash
npm install oracledb
```

**Cause 2:** Missing grants on the buffer tables (shared install).

**Solution:** Run as DBA:
```sql
GRANT SELECT, DELETE ON UT3.UT_OUTPUT_BUFFER_TMP TO PUBLIC;
GRANT SELECT, DELETE ON UT3.UT_OUTPUT_BUFFER_INFO_TMP TO PUBLIC;
```
See [Direct Oracle Execution](Oracle-direct-execution).

---

## Schema always shows "UNKNOWN"

**Symptom:** In `schema` mode, all tests appear under "UNKNOWN".

**Cause:** The `schemaPattern` does not match the directory structure.

**Solution:** Adjust the pattern. Examples:
```jsonc
// Structure: src/HR/tests/ut_hr.pks
"utplsql.organization.schemaPattern": "src/{schema}/tests/**"

// Structure: db/APP/packages/ut_foo.pks
"utplsql.organization.schemaPattern": "db/{schema}/**"
```

The `{schema}` placeholder captures exactly one directory level.
Use `**` for any depth of subdirectories after the schema.

> **Database discovery (0.11.0):** In `schema` mode, when Oracle is available
> (`runnerMode` `auto`/`oracle` and connection configured), the extension also
> discovers suites directly from the database (`ALL_OBJECTS`/`ALL_SOURCE`) for
> schemas whose `.pks` files are not in the workspace. The schemas queried are
> the directories under the base of the `schemaPattern` (e.g., `db/*`) and the
> schemas of local suites. Suites from the database appear with virtual URI
> `utplsql-db:/` and **do not have** CodeLens, inline decorations, or jump to
> failure — only execution from the tree. `UT_*` packages (utPLSQL framework)
> are ignored.
