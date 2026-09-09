# FAQ

## General

### My tests do not appear in the Test Explorer

Check the following:
1. The files have an extension covered by `utplsql.includePatterns` (default: `**/*.pks`)
2. The `%suite` and `%test` annotations are in the **spec** (`.pks`), not the body
3. The file has a `create package` declaration and at least one `%test` followed by `PROCEDURE`
4. Run `utPLSQL: Refresh Tests` to force rediscovery
5. Run `utPLSQL: Validate Configuration` for automatic diagnostics on connection and grants

### Can I use it with Oracle XE?

Yes. utPLSQL works with Oracle XE 18c+. Coverage requires the `DBMS_PROFILER`
grants (see [Database Requirements](Database-Requirements)).

### Does it work with Oracle Cloud (Autonomous Database)?

Yes. Use the Wallet format in the connection string:

```
user/pass@tcps://adb.region.oraclecloud.com:1522/service?wallet_location=/path/to/wallet
```

See [Connection](Connection) for details.

### Does the extension work on Linux? And on macOS?

Yes. The extension is cross-platform.

### The Run/Run with Coverage buttons do not appear above %suite/%test

Check that `utplsql.codeLens.enabled` is `true` (the default). Also make sure
that `editor.codeLens` is not disabled in VS Code settings.

### What do the icons on the lines mean after running tests?

After each run, the extension displays inline decorations in the editor:
- ✓ green — test passed
- ✗ red — test failed (the tooltip shows the error message)
- ⚠ yellow — test skipped or with an error

Hover over the icon to see the failure message. Disable with
`utplsql.decorations.enabled: false`.

### What are the keyboard shortcuts?

Use the prefix `Ctrl+Shift+U` + a mnemonic key. The main ones:

| Shortcut | Action |
|---|---|
| `Ctrl+Shift+U R` | Run all tests |
| `Ctrl+Shift+U T` | Run tests in file |
| `Ctrl+Shift+U F` | Refresh |
| `Ctrl+Shift+U L` | Rerun last |
| `Ctrl+Shift+U U` | Run at cursor |
| `Ctrl+Shift+U X` | Run failed only |
| `Escape` | Cancel execution |

To see all shortcuts, go to File → Preferences → Keyboard Shortcuts and search
for `utplsql`.

### How do I re-run only the tests that failed?

Use `Ctrl+Shift+U X` (Run Failed Only) or the `utPLSQL: Run Failed Tests`
command in the palette. The extension stores which tests failed in the last run
and re-executes them in isolation.

### How do I run the test under the cursor?

With a `.pks` file open, press `Ctrl+Shift+U U` (Run at Cursor). The extension
finds the `%suite` or `%test` annotation above the cursor and runs only that
test/suite.

---

## Coverage

### Coverage always shows 0%

The most common causes:
1. Missing `GRANT EXECUTE ON DBMS_PROFILER` — run the grants
2. Coverage reporter not installed — update utPLSQL
3. Regex in `coverageSourceArgs` does not match — enable `dbmsOutput` to debug
4. `sourcePath` points to a folder that does not contain the sources

See [Troubleshooting](Troubleshooting) for detailed diagnostics.

### How do I know if the coverage regex is working?

Enable `utplsql.dbmsOutput: true` and check the test output in the test view's
terminal. utPLSQL logs which SQL objects were mapped to files.

### Can I map coverage for objects that are not packages?

Yes. `type_mapping` supports `FUNCTION`, `PROCEDURE`, `TRIGGER`, `VIEW`,
`PACKAGE BODY`, etc. Configure it according to your file naming convention in
`coverageSourceArgs`. See [Coverage](Coverage) for examples.

### Does coverage work without the coverage reporter?

No. If `UT_COVERAGE_COBERTURA_REPORTER` does not exist in the database,
coverage is **automatically disabled** with a warning in the output. Tests run
normally, but without coverage.

---

## Connection and security

### How do I avoid exposing my password in settings.json?

Use the `UTPLSQL_CONN` environment variable instead of the
`utplsql.connection` setting. Set it before opening VS Code:

```bash
export UTPLSQL_CONN="user/pass@//host:1521/service"
code .
```

### Can I use an Oracle wallet without a password?

Yes, if your wallet is configured with SSO (Single Sign-On) authentication:

```
user@tcps://host:1522/service?wallet_location=/path/to/wallet
```

Without `/pass` in the format — Oracle authenticates via certificate.

---

## CI/CD and development

### Can I use it with GitHub Actions?

Yes. Expose the `UTPLSQL_CONN` env var as a secret and configure the settings
in the job:

```yaml
- uses: actions/checkout@v7
- run: npm ci
- run: npm run compile
- run: npm test
  env:
    UTPLSQL_CONN: ${{ secrets.UTPLSQL_CONN }}
```

### Why are my integration tests skipped?

Tests that use a real database (`describeDB` in `extension.test.ts`) require
the environment variable to be defined in `.env`:

```bash
UTPLSQL_CONN=...
```

Without it, `describeDB` is automatically skipped with `describe.skip`.

### Can I publish the extension locally?

Use `npm run package` to generate a `.vsix` for internal testing. Publishing
to the Marketplace is done **exclusively** via a GitHub release (through the
`publish.yml` workflow).

```bash
npm run package
# generates: vscode-utplsql-0.12.0.vsix
code --install-extension vscode-utplsql-0.12.0.vsix
```

---

## Direct Oracle (streaming)

### Do I need to install anything to use Direct Oracle?

No — the VSIX already includes the `oracledb` **thin** driver (pure JavaScript,
no Instant Client).

### Does it work with a shared install (UT3)?

Yes, but it requires grants on the buffer tables:
```sql
GRANT SELECT, DELETE ON UT3.UT_OUTPUT_BUFFER_TMP TO PUBLIC;
GRANT SELECT, DELETE ON UT3.UT_OUTPUT_BUFFER_INFO_TMP TO PUBLIC;
```
Without these grants, direct execution will not work — set up a dedicated
schema for utPLSQL.

---

## Diagnostics

### How do I see PL/SQL compilation errors in the editor?

It is automatic. After running tests, the extension analyzes the output. If
there are errors like `PLS-00201` or `ORA-06550`, they appear as **red
squiggly underlines** in the `.pks`/`.pkb` file and in the **Problems Panel**
(source: "utPLSQL Compilation"). Disable with
`utplsql.compilationDiagnostics.enabled: false`.

### How do I validate that my configuration is correct?

Run `utPLSQL: Validate Configuration` (palette `Ctrl+Shift+P`). The extension
checks the Oracle connection, utPLSQL version, and the **installation integrity**
(invalid objects in the utPLSQL schema). Results appear in the Problems Panel
with **quick-fix actions** (💡 icon) — including **"Recompile UT3"** when there
are invalid objects.

### How do I get the coverage grants without typing?

Use `utPLSQL: Copy Coverage Grants to Clipboard` — copies the ready-to-use SQL
to the clipboard. Paste it in SQL*Plus/SQL Developer as DBA.

---

## Tree organization

### How do I organize tests by schema?

Change `utplsql.organization` to `schema` and configure `organization.schemaPattern`:

```jsonc
{
  "utplsql.organization": "schema",
  "utplsql.organization.schemaPattern": "db/{schema}/**"
}
```

With a `db/APP/tests/` and `db/LOGIC/tests/` structure, the Test Explorer shows
`Schema: APP` and `Schema: LOGIC` as root nodes. See [Tree Organization](Tree-Organization).

### Do tests appear even without the `.pks` files in the workspace?

Yes — with `runnerMode` `auto`/`oracle` and a connection configured, the refresh
also discovers suites directly from the database (`ALL_OBJECTS`/`ALL_SOURCE`) for
schemas in the directories under the base of the `schemaPattern` (e.g., `db/*`).
These suites appear with a virtual URI (`utplsql-db:/`) and execute normally, but
**do not** have CodeLens, inline decorations, or jump to failure.

### Does it work with multi-root workspaces?

Yes. Each workspace folder maintains its own schemas. The `schemaPattern` is
applied to the relative path within each folder.

---

## Navigation and productivity

### How do I jump directly to the failed assertion line?

When a test fails, VS Code shows a **"Go to Error"** button in the Test
Explorer (arrow icon). Clicking it opens the `.pks`/`.pkb` file at the exact
line of the failure. This works automatically — the extension extracts the stack
trace from the JUnit output and resolves it to the source file.
