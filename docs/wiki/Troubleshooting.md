<!-- GENERATED FROM docs/brain/70-Wiki/Troubleshooting.md — DO NOT EDIT -->

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

**Cause 1:** `utplsql.compilationDiagnostics.enabled` is `false` (default is `true`).

**Cause 2:** Diagnostics are published **after a test run**, and only for packages
discovered in the workspace (best-effort) — nothing appears before the first run.

**Solution:** Enable `utplsql.compilationDiagnostics.enabled` and run the tests.
Errors from `ALL_ERRORS` are then mapped to the suite files and shown as
underlines in the editor and in the Problems Panel (source "utPLSQL Compilation").

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

**Cause 3:** `sourcePath` points to the wrong folder, or the
`sourcePath/<type>/<name>.sql` layout does not match the covered objects.

**Solution:** Adjust `utplsql.sourcePath` and the folder layout
(`functions/`, `procedures/`, `packages/`, `views/`, ...). There is no
per-object log: when nothing is mapped, the run output shows the generic
message `[coverage] no file mapped`.

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

## Garbled characters when running scripts (`ç`, `ã`, `€`)

**Symptom:** accents or symbols arrive mangled in the database after
`utPLSQL: Run script file` / `utPLSQL: Run script folder`.

**Cause:** the file was decoded with the wrong encoding. The Oracle driver in
thin mode always uses AL32UTF8 on the connection — the profile `charset` only
controls how the **file** is read before sending.

**Solution:**
1. Check the file's real encoding and set the profile `charset`
   (`utf8` | `latin1` | `win1252`, default `utf8`)
2. The "utPLSQL Script" OutputChannel logs the charset used in the header
   (e.g. `seed.sql (win1252)`) — use it to diagnose
3. There is no encoding auto-detection (unreliable): mark the correct
   charset on the profile
4. Note: `latin1` (true ISO-8859-1) ≠ `win1252` for bytes `0x80`–`0x9F`
   (e.g. `€` only exists in `win1252`)
5. **Legacy database character set:** the `node-oracledb` thin driver always
   uses `AL32UTF8` and ignores `NLS_LANG`; the server converts. On a database
   with a legacy charset (e.g. 12.2 `WE8DEC`), non-representable characters
   (`€`) are lost (`¿`) and the extension cannot fix it — configure the
   database with `AL32UTF8` (PRD-84).

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

**Symptom:** the run fails with "oracledb not available" or a
connection error.

**Cause 1:** `node-oracledb` is not installed (the VSIX already ships the
thin driver as a mandatory dependency; in development, run `npm install`).

**Solution:** reinstall dependencies:
```bash
npm install
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

> **Database discovery (DB-first since 0.13.0):** In `schema` mode, when there is a
> configured connection (without prompt), the extension discovers suites directly
> from the database via `ut_runner.get_suites_info` (utPLSQL ≥ 3.1.3), falling
> back to `ALL_OBJECTS`/`ALL_SOURCE` for
> schemas whose `.pks` files are not in the workspace. The schemas queried are
> the directories under the base of the `schemaPattern` (e.g., `db/*`) and the
> schemas of local suites. Suites from the database appear with virtual URI
> `utplsql-db:/`, open **read-only** (source from `ALL_SOURCE`) so **jump to
> failure** works. They have **no CodeLens and no inline decorations**.

## Debugger doesn't stop at breakpoints

The PL/SQL debugger uses `DBMS_DEBUG`, which requires:

- the target package compiled **with debug information** — Oracle strips it at
  `PLSQL_OPTIMIZE_LEVEL = 2` (the default). Compile with
  `ALTER SESSION SET PLSQL_OPTIMIZE_LEVEL = 1` before creating the package, or
  recompile with `ALTER PACKAGE <pkg> COMPILE DEBUG PLSQL_OPTIMIZE_LEVEL = 1`
  (the **`utPLSQL: Compile for Debug`** command does both);
- `GRANT DEBUG CONNECT SESSION` and `GRANT EXECUTE ON SYS.DBMS_DEBUG` — see
  [Database requirements](Database-requirements);
- breakpoints in the **test package** (`test_*.pkb`) may not hit — utPLSQL runs
  tests through dynamic SQL, so set the breakpoints in the **code under test**
  (production function/procedure/package) instead.

Also make sure `utplsql.debugger.enabled` is on (default). Without debug info the
breakpoints are **silently ignored** and the test runs to completion.

## Opt-in diagnostics (`UTPLSQL_DEBUG`)

Set `UTPLSQL_DEBUG=1` before launching VSCode to enable diagnostic logs in the
Extension Host console (connection, discovery and coverage failures with
context). Unset = silent. Credentials are never logged.
