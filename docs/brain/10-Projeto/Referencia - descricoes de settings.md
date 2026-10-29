---
tipo: nota
status: ativo
titulo: "Referência — descrições de settings"
verificado: 2026-10-29
tags: [docs, settings]
---

# Referência — descrições de settings

Fonte das descrições curtas usadas pelo gerador de tabelas do `brain:sync`
(PRD-98). Edite **este arquivo** para ajustar a prosa; os IDs, defaults e títulos
continuam vindo do `package.json`/`package.nls.json`.

```json
{
  "utplsql.connection": {
    "default": "\"\"",
    "description": "Oracle connection. **Leave empty** and use the `UTPLSQL_CONN` environment variable to avoid storing the password. If both are empty, the extension asks (keeps it only in the session)."
  },
  "utplsql.sourcePath": {
    "default": "install",
    "description": "Folder of the production code (to map coverage to files)."
  },
  "utplsql.includePatterns": {
    "default": "[\"**/*.pks\"]",
    "description": "Additional globs to discover the specs with `%suite`/`%test`. Combined with `utplsql.discovery.languageIds` and `files.associations`."
  },
  "utplsql.discovery.languageIds": {
    "default": "[\"plsql\", \"sql\", \"oracle-sql\"]",
    "description": "Language IDs treated as PL/SQL for discovery, CodeLens and decorations. Extensions are resolved from the installed extensions and `files.associations`; use `[\"plsql\"]` to avoid scanning `.sql`."
  },
  "utplsql.generate.testPackagePrefix": {
    "default": "ut_",
    "description": "Prefix of the generated test package name."
  },
  "utplsql.generate.testPackageSuffix": {
    "default": "\"\"",
    "description": "Suffix of the generated test package name."
  },
  "utplsql.generate.numberOfTestsPerUnit": {
    "default": "1",
    "description": "`%test` generated per routine of the production package."
  },
  "utplsql.generate.generateComments": {
    "default": "true",
    "description": "Adds `-- TODO` to each generated `%test`."
  },
  "utplsql.showTestDuration": {
    "default": "false",
    "description": "Suffixes the duration of the last run to the test item labels (e.g. `(1.2s)`)."
  },
  "utplsql.coverageOwner": {
    "default": "\"\"",
    "description": "Schema owner of the covered objects. Empty = uses the connection user (uppercase)."
  },
  "utplsql.coverage.schemes": {
    "default": "[]",
    "description": "Covered schemas (`a_coverage_schemes`). Empty = the connection user (or `utplsql.coverageOwner`)."
  },
  "utplsql.coverage.includeObjects": {
    "default": "[]",
    "description": "Objects to include in coverage, as `OWNER.NAME` (e.g. `[\"APP.MY_PKG\"]`). Useful for dynamically reached objects."
  },
  "utplsql.coverage.excludeObjects": {
    "default": "[]",
    "description": "Objects to exclude from coverage, as `OWNER.NAME` (e.g. `[\"UT3.UT_COVERAGE\"]`)."
  },
  "utplsql.coverage.includeSchemaExpr": {
    "default": "\"\"",
    "description": "Regex of schemas to include in coverage (e.g. `^APP$`)."
  },
  "utplsql.coverage.includeObjectExpr": {
    "default": "\"\"",
    "description": "Regex of objects to include in coverage."
  },
  "utplsql.coverage.excludeSchemaExpr": {
    "default": "\"\"",
    "description": "Regex of schemas to exclude from coverage."
  },
  "utplsql.coverage.excludeObjectExpr": {
    "default": "\"\"",
    "description": "Regex of objects to exclude from coverage (e.g. `^UT_` for the utPLSQL framework)."
  },
  "utplsql.coverage.htmlReport": {
    "default": "false",
    "description": "Writes the utPLSQL HTML coverage report to `test-results/coverage.html` and offers **Open in Browser** / **Save to file…** after the run (fire-and-forget)."
  },
  "utplsql.timeoutMinutes": {
    "default": "60",
    "description": "Timeout in minutes for the test execution."
  },
  "utplsql.dbmsOutput": {
    "default": "false",
    "description": "Enables `DBMS_OUTPUT` in the test session. Useful for debugging."
  },
  "utplsql.additionalReporters": {
    "default": "[]",
    "description": "Additional reporters to include on every run (e.g. `[\"ut_coverage_html_reporter\"]`). The default reporters (documentation and junit) are always included and don't need to be listed; the coverage reporter is added only when running with coverage."
  },
  "utplsql.reporter.clientCharacterSet": {
    "default": "\"\"",
    "description": "Client charset (`a_client_character_set`) for the **Run with Reporter (Export)** command. Empty uses the reporter default."
  },
  "utplsql.reporter.colorConsole": {
    "default": "false",
    "description": "Enables ANSI color (`a_color_console`) for textual console reporters in the export."
  },
  "utplsql.tags": {
    "default": "\"\"",
    "description": "utPLSQL tag expression to filter which tests run (e.g. `fast & !integration`). Empty runs all."
  },
  "utplsql.run.randomOrder": {
    "default": "false",
    "description": "Runs the tests in random order to reveal order dependencies between them."
  },
  "utplsql.run.randomOrderSeed": {
    "default": "0",
    "description": "Seed for the random order. `0` = chosen by the database (not reproducible); > 0 reproduces the same order."
  },
  "utplsql.codeLens.enabled": {
    "default": "true",
    "description": "Shows Run/Run with Coverage CodeLens buttons over `%suite` and `%test`."
  },
  "utplsql.statusBar.enabled": {
    "default": "true",
    "description": "Shows the test status indicator in the status bar."
  },
  "utplsql.decorations.enabled": {
    "default": "true",
    "description": "Shows pass/fail decorations on `%suite` and `%test` lines after execution."
  },
  "utplsql.oraclePoolMin": {
    "default": "2",
    "description": "Minimum connections kept in the Oracle runner pool (node-oracledb)."
  },
  "utplsql.oraclePoolMax": {
    "default": "10",
    "description": "Maximum connections in the Oracle runner pool (node-oracledb)."
  },
  "utplsql.oraclePoolIncrement": {
    "default": "1",
    "description": "Increment when expanding the Oracle runner pool (node-oracledb)."
  },
  "utplsql.oraclePoolPingInterval": {
    "default": "60",
    "description": "Seconds between health checks of idle pool connections (node-oracledb). `0` = ping on every checkout."
  },
  "utplsql.oracleClientMode": {
    "default": "thin",
    "description": "Driver mode: `thin` (pure JavaScript, no native client) or `thick` (uses the Oracle Instant Client). Use `thick` only for databases that require NNE (Native Network Encryption); requires `utplsql.oracleClientLibDir` and a window reload."
  },
  "utplsql.oracleClientLibDir": {
    "default": "\"\"",
    "description": "Oracle Instant Client directory. Required when `utplsql.oracleClientMode` is `thick` (e.g. `C:\\oracle\\instantclient_23_5`)."
  },
  "utplsql.oracleClientConfigDir": {
    "default": "\"\"",
    "description": "Oracle configuration directory (TNS_ADMIN) with `sqlnet.ora`/`tnsnames.ora`. Optional; used only by the thick driver."
  },
  "utplsql.connections.tnsAdminPath": {
    "default": "\"\"",
    "description": "Directory with `tnsnames.ora` to resolve **TNS aliases in the thin driver**. Resolution: this setting → user/machine value of `sqldeveloper.connections.tnsConfiguration.path` → `TNS_ADMIN` env var. Easy Connect keeps working."
  },
  "utplsql.organization": {
    "default": "file",
    "description": "Tree organization: `file` (by path), `schema` (Schema > Package > Suite > Test) or `tag` (Tag > Suite > Test, from `%tags`; suites with several tags appear under each tag and untagged ones under \"(sem tag)\"). In `schema` mode, suites are also discovered from the database (`ut_runner.get_suites_info`, falling back to `ALL_OBJECTS`/`ALL_SOURCE`) when `.pks` files are not in the workspace — virtual URI `utplsql-db:/` (execution and jump to failure work; no CodeLens/decorations). Without local sources, failures and coverage open a **read-only virtual document** (`utplsql-source:/`, resolved from `ALL_SOURCE`)."
  },
  "utplsql.organization.schemaPattern": {
    "default": "db/{schema}/**",
    "description": "Glob pattern to extract the schema from the path. Use `{schema}` as the placeholder. In `schema` mode, the directories below the pattern base (e.g. `db/*`) define the schemas queried in the database."
  },
  "utplsql.discovery.source": {
    "default": "auto",
    "description": "Source of the test tree in `schema` mode: `auto` uses the database API (`ut_runner.get_suites_info`) and falls back to `ALL_SOURCE`/files when unavailable; `database` requires the API; `file` disables database discovery."
  },
  "utplsql.refreshDebounceMs": {
    "default": "300",
    "description": "Debounce (ms) to coalesce `.pks`/`.pkb` file watcher events before refreshing the Test Explorer."
  },
  "utplsql.compilationDiagnostics.enabled": {
    "default": "true",
    "description": "Shows PL/SQL compilation errors from the database (`ALL_ERRORS`) as underlines in the editor and in the Problems Panel (source \"utPLSQL Compilation\")."
  },
  "utplsql.setupDiagnostics.enabled": {
    "default": "true",
    "description": "Shows configuration diagnostics (connection, grants, version) and **utPLSQL installation integrity** (invalid objects in the UT3 schema, with \"Recompile UT3\" quick-fix) with quick-fix actions."
  },
  "utplsql.showTagsInTree": {
    "default": "false",
    "description": "Appends the `%tags` of each suite/test as a `[tag1, tag2]` suffix on the Test Explorer label."
  },
  "utplsql.autoRun": {
    "default": "off",
    "description": "Auto-run on save (watch mode): `off` or `onSave` (re-runs the suites of the saved `.pks`)."
  },
  "utplsql.autoRunDelayMs": {
    "default": "500",
    "description": "Debounce (ms) per file for auto-run; rapid saves of the same file trigger a single run."
  },
  "utplsql.autoRunQueue": {
    "default": "skip",
    "description": "What to do when auto-run fires during a run: `skip` ignores it, `replace` reschedules it."
  },
  "utplsql.profiles": {
    "default": "[]",
    "description": "Saved Oracle connection profiles (name, connection, and overrides of `sourcePath`/`coverageOwner`/etc.) to switch between environments. **Passwords are kept in the OS keychain (VS Code SecretStorage), not in settings** — the `connection` field stores only `user@//host:port/service`. Legacy profiles with an inline password are migrated automatically on first use. (Full field reference: [wiki](https://github.com/thepaneb/vscode-utplsql/wiki/Configuration))."
  },
  "utplsql.activeProfile": {
    "default": "\"\"",
    "description": "ID of the active profile (`utplsql.profiles`). When set, overrides `utplsql.connection`."
  },
  "utplsql.sqlCoverageEnabled": {
    "default": "false",
    "description": "Tracks views executed via `V$SQL` (boolean coverage). Requires `GRANT SELECT ON V$SQL`."
  },
  "utplsql.debugger.enabled": {
    "default": "true",
    "description": "Enables PL/SQL test debugging (`DBMS_DEBUG`). Requires `node-oracledb` + grants. Compile the target package with debug info (`PLSQL_OPTIMIZE_LEVEL <= 1`) and grant `DEBUG CONNECT SESSION` + `EXECUTE ON SYS.DBMS_DEBUG`."
  },
  "utplsql.debugger.stopOnException": {
    "default": "true",
    "description": "Pauses on PL/SQL exceptions during debugging."
  },
  "utplsql.debugger.timeoutSeconds": {
    "default": "300",
    "description": "Timeout (s) of the debug session."
  },
  "utplsql.debugger.compileOnDebug": {
    "default": "false",
    "description": "Compiles the object with debug information (`ALTER … COMPILE DEBUG PLSQL_OPTIMIZE_LEVEL = 1`) before starting the debug session."
  },
  "utplsql.scriptRunner.stopOnError": {
    "default": "true",
    "description": "Stops script execution on the first failure (`false` = keeps logging the rest)."
  },
  "utplsql.scriptRunner.autoCommit": {
    "default": "true",
    "description": "`autoCommit` on each script statement."
  },
  "utplsql.scriptRunner.filePattern": {
    "default": "**/*.{sql,pks,pkb,fnc,prc,trg}",
    "description": "Globs to list files when running a script folder."
  },
  "utplsql.scriptRunner.dbmsOutput": {
    "default": "false",
    "description": "Captures and displays `DBMS_OUTPUT` during script execution."
  },
  "utplsql.scriptRunner.timeoutSeconds": {
    "default": "300",
    "description": "Per-statement timeout (s) for scripts (`callTimeout`)."
  },
  "utplsql.language": {
    "default": "auto",
    "description": "Language of the runtime messages. `auto` follows VSCode (pt, zh-tw/zh-hk, zh, es, ja, de, fr, it, ko, ru, tr, pl, cs, hu, bg, el, id, ro, sr, th, uk, vi, en-gb; otherwise en). Covers the **24 locales**."
  }
}
```
