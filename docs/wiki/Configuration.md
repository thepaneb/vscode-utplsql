<!-- GENERATED FROM docs/brain/70-Wiki/Configuration.md — DO NOT EDIT -->

# Configuration (settings)

## Generated settings reference

> The complete, generated list is below. The sections after it are curated by
> theme and remain the narrative reference; both are checked by `docs:check`.

<!-- brain:auto:start:settings -->
| Setting | Default | Description |
|---|---|---|
| `utplsql.activeProfile` | `""` | ID of the active profile (`utplsql.profiles`). When set, overrides `utplsql.connection`. |
| `utplsql.additionalReporters` | `[]` | Additional reporters to include on every run (e.g. `["ut_coverage_html_reporter"]`). The default reporters (documentation and junit) are always included and don't need to be listed; the coverage reporter is added only when running with coverage. |
| `utplsql.autoRun` | `off` | Auto-run on save (watch mode): `off` or `onSave` (re-runs the suites of the saved `.pks`). |
| `utplsql.autoRunDelayMs` | `500` | Debounce (ms) per file for auto-run; rapid saves of the same file trigger a single run. |
| `utplsql.autoRunQueue` | `skip` | What to do when auto-run fires during a run: `skip` ignores it, `replace` reschedules it. |
| `utplsql.codeLens.enabled` | `true` | Shows Run/Run with Coverage CodeLens buttons over `%suite` and `%test`. |
| `utplsql.compilationDiagnostics.enabled` | `true` | Shows PL/SQL compilation errors from the database (`ALL_ERRORS`) as underlines in the editor and in the Problems Panel (source "utPLSQL Compilation"). |
| `utplsql.connection` | `""` | Oracle connection. **Leave empty** and use the `UTPLSQL_CONN` environment variable to avoid storing the password. If both are empty, the extension asks (keeps it only in the session). |
| `utplsql.connections.tnsAdminPath` | `""` | Directory with `tnsnames.ora` to resolve **TNS aliases in the thin driver**. Resolution: this setting → user/machine value of `sqldeveloper.connections.tnsConfiguration.path` → `TNS_ADMIN` env var. Easy Connect keeps working. |
| `utplsql.coverage.excludeObjectExpr` | `""` | Regex of objects to exclude from coverage (e.g. `^UT_` for the utPLSQL framework). |
| `utplsql.coverage.excludeObjects` | `[]` | Objects to exclude from coverage, as `OWNER.NAME` (e.g. `["UT3.UT_COVERAGE"]`). |
| `utplsql.coverage.excludeSchemaExpr` | `""` | Regex of schemas to exclude from coverage. |
| `utplsql.coverage.htmlReport` | `false` | Writes the utPLSQL HTML coverage report to `test-results/coverage.html` and offers **Open in Browser** / **Save to file…** after the run (fire-and-forget). |
| `utplsql.coverage.includeObjectExpr` | `""` | Regex of objects to include in coverage. |
| `utplsql.coverage.includeObjects` | `[]` | Objects to include in coverage, as `OWNER.NAME` (e.g. `["APP.MY_PKG"]`). Useful for dynamically reached objects. |
| `utplsql.coverage.includeSchemaExpr` | `""` | Regex of schemas to include in coverage (e.g. `^APP$`). |
| `utplsql.coverage.schemes` | `[]` | Covered schemas (`a_coverage_schemes`). Empty = the connection user (or `utplsql.coverageOwner`). |
| `utplsql.coverageOwner` | `""` | Schema owner of the covered objects. Empty = uses the connection user (uppercase). |
| `utplsql.dbmsOutput` | `false` | Enables `DBMS_OUTPUT` in the test session. Useful for debugging. |
| `utplsql.debugger.compileOnDebug` | `false` | Compiles the object with debug information (`ALTER … COMPILE DEBUG PLSQL_OPTIMIZE_LEVEL = 1`) before starting the debug session. |
| `utplsql.debugger.enabled` | `true` | Enables PL/SQL test debugging (`DBMS_DEBUG`). Requires `node-oracledb` + grants. Compile the target package with debug info (`PLSQL_OPTIMIZE_LEVEL <= 1`) and grant `DEBUG CONNECT SESSION` + `EXECUTE ON SYS.DBMS_DEBUG`. |
| `utplsql.debugger.stopOnException` | `true` | Pauses on PL/SQL exceptions during debugging. |
| `utplsql.debugger.timeoutSeconds` | `300` | Timeout (s) of the debug session. |
| `utplsql.decorations.enabled` | `true` | Shows pass/fail decorations on `%suite` and `%test` lines after execution. |
| `utplsql.discovery.languageIds` | `["plsql", "sql", "oracle-sql"]` | Language IDs treated as PL/SQL for discovery, CodeLens and decorations. Extensions are resolved from the installed extensions and `files.associations`; use `["plsql"]` to avoid scanning `.sql`. |
| `utplsql.discovery.source` | `auto` | Source of the test tree in `schema` mode: `auto` uses the database API (`ut_runner.get_suites_info`) and falls back to `ALL_SOURCE`/files when unavailable; `database` requires the API; `file` disables database discovery. |
| `utplsql.generate.generateComments` | `true` | Adds `-- TODO` to each generated `%test`. |
| `utplsql.generate.numberOfTestsPerUnit` | `1` | `%test` generated per routine of the production package. |
| `utplsql.generate.testPackagePrefix` | `ut_` | Prefix of the generated test package name. |
| `utplsql.generate.testPackageSuffix` | `""` | Suffix of the generated test package name. |
| `utplsql.includePatterns` | `["**/*.pks"]` | Additional globs to discover the specs with `%suite`/`%test`. Combined with `utplsql.discovery.languageIds` and `files.associations`. |
| `utplsql.language` | `auto` | Language of the runtime messages. `auto` follows VSCode (pt, zh-tw/zh-hk, zh, es, ja, de, fr, it, ko, ru, tr, pl, cs, hu, bg, el, id, ro, sr, th, uk, vi, en-gb; otherwise en). Covers the **24 locales**. |
| `utplsql.oracleClientConfigDir` | `""` | Oracle configuration directory (TNS_ADMIN) with `sqlnet.ora`/`tnsnames.ora`. Optional; used only by the thick driver. |
| `utplsql.oracleClientLibDir` | `""` | Oracle Instant Client directory. Required when `utplsql.oracleClientMode` is `thick` (e.g. `C:\\oracle\\instantclient_23_5`). |
| `utplsql.oracleClientMode` | `thin` | Driver mode: `thin` (pure JavaScript, no native client) or `thick` (uses the Oracle Instant Client). Use `thick` only for databases that require NNE (Native Network Encryption); requires `utplsql.oracleClientLibDir` and a window reload. |
| `utplsql.oraclePoolIncrement` | `1` | Increment when expanding the Oracle runner pool (node-oracledb). |
| `utplsql.oraclePoolMax` | `10` | Maximum connections in the Oracle runner pool (node-oracledb). |
| `utplsql.oraclePoolMin` | `2` | Minimum connections kept in the Oracle runner pool (node-oracledb). |
| `utplsql.oraclePoolPingInterval` | `60` | Seconds between health checks of idle pool connections (node-oracledb). `0` = ping on every checkout. |
| `utplsql.organization` | `file` | Tree organization: `file` (by path), `schema` (Schema > Package > Suite > Test) or `tag` (Tag > Suite > Test, from `%tags`; suites with several tags appear under each tag and untagged ones under "(sem tag)"). In `schema` mode, suites are also discovered from the database (`ut_runner.get_suites_info`, falling back to `ALL_OBJECTS`/`ALL_SOURCE`) when `.pks` files are not in the workspace — virtual URI `utplsql-db:/` (execution and jump to failure work; no CodeLens/decorations). Without local sources, failures and coverage open a **read-only virtual document** (`utplsql-source:/`, resolved from `ALL_SOURCE`). |
| `utplsql.organization.schemaPattern` | `db/{schema}/**` | Glob pattern to extract the schema from the path. Use `{schema}` as the placeholder. In `schema` mode, the directories below the pattern base (e.g. `db/*`) define the schemas queried in the database. |
| `utplsql.profiles` | `[]` | Saved Oracle connection profiles (name, connection, and overrides of `sourcePath`/`coverageOwner`/etc.) to switch between environments. **Passwords are kept in the OS keychain (VS Code SecretStorage), not in settings** — the `connection` field stores only `user@//host:port/service`. Legacy profiles with an inline password are migrated automatically on first use. (Full field reference: [wiki](https://github.com/thepaneb/vscode-utplsql/wiki/Configuration)). |
| `utplsql.refreshDebounceMs` | `300` | Debounce (ms) to coalesce `.pks`/`.pkb` file watcher events before refreshing the Test Explorer. |
| `utplsql.reporter.clientCharacterSet` | `""` | Client charset (`a_client_character_set`) for the **Run with Reporter (Export)** command. Empty uses the reporter default. |
| `utplsql.reporter.colorConsole` | `false` | Enables ANSI color (`a_color_console`) for textual console reporters in the export. |
| `utplsql.run.randomOrder` | `false` | Runs the tests in random order to reveal order dependencies between them. |
| `utplsql.run.randomOrderSeed` | `0` | Seed for the random order. `0` = chosen by the database (not reproducible); > 0 reproduces the same order. |
| `utplsql.scriptRunner.autoCommit` | `true` | `autoCommit` on each script statement. |
| `utplsql.scriptRunner.dbmsOutput` | `false` | Captures and displays `DBMS_OUTPUT` during script execution. |
| `utplsql.scriptRunner.filePattern` | `**/*.{sql,pks,pkb,fnc,prc,trg}` | Globs to list files when running a script folder. |
| `utplsql.scriptRunner.stopOnError` | `true` | Stops script execution on the first failure (`false` = keeps logging the rest). |
| `utplsql.scriptRunner.timeoutSeconds` | `300` | Per-statement timeout (s) for scripts (`callTimeout`). |
| `utplsql.setupDiagnostics.enabled` | `true` | Shows configuration diagnostics (connection, grants, version) and **utPLSQL installation integrity** (invalid objects in the UT3 schema, with "Recompile UT3" quick-fix) with quick-fix actions. |
| `utplsql.showTagsInTree` | `false` | Appends the `%tags` of each suite/test as a `[tag1, tag2]` suffix on the Test Explorer label. |
| `utplsql.showTestDuration` | `false` | Suffixes the duration of the last run to the test item labels (e.g. `(1.2s)`). |
| `utplsql.sourcePath` | `install` | Folder of the production code (to map coverage to files). |
| `utplsql.sqlCoverageEnabled` | `false` | Tracks views executed via `V$SQL` (boolean coverage). Requires `GRANT SELECT ON V$SQL`. |
| `utplsql.statusBar.enabled` | `true` | Shows the test status indicator in the status bar. |
| `utplsql.tags` | `""` | utPLSQL tag expression to filter which tests run (e.g. `fast & !integration`). Empty runs all. |
| `utplsql.timeoutMinutes` | `60` | Timeout in minutes for the test execution. |
<!-- brain:auto:end -->

All extension settings, prefixed with `utplsql.`. Configure them in the
user or workspace `settings.json` (`.vscode/settings.json`).

Looking for ready-to-use snippets? See [Configuration Examples](Configuration-examples).

## Connection

| Setting | Default | Description |
|---|---|---|
| `utplsql.connection` | `""` | Oracle connection. Leave empty and use `UTPLSQL_CONN` to avoid storing passwords. |
| `utplsql.profiles` | `[]` | Saved connection profiles (see field table below). |
| `utplsql.activeProfile` | `""` | Active connection profile. Empty = uses `connection`/`UTPLSQL_CONN`. |

### Profile fields (`utplsql.profiles`)

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `id` | string | No (auto-generated) | — | Profile UUID. Generated when omitted. |
| `name` | string | Yes | — | Friendly name (e.g. "DEV Local"). |
| `connection` | string | Yes | — | Connection string **without password** (`user@//host:port/service`). The password is kept in the OS keychain (VS Code SecretStorage), keyed by profile `id`. |
| `description` | string | No | — | Description shown in the connection picker. |
| `charset` | enum | No | `utf8` | Encoding used to read script files: `utf8`, `latin1` or `win1252`. |
| `sourcePath` | string | No | inherits global | Overrides `utplsql.sourcePath`. |
| `coverageOwner` | string | No | inherits global | Overrides `utplsql.coverageOwner`. |
| `includePatterns` | string[] | No | inherits global | Overrides `utplsql.includePatterns`. |
| `walletLocation` | string | No | — | Oracle Cloud wallet location for the profile (thin driver). The wallet password lives in the SecretStorage (`utPLSQL: Set wallet password`). |
| `isDefault` | boolean | No | `false` | Shows a default badge in the profile picker. It does **not** auto-select the profile on load. |
| `lastUsed` | string | No | — | Reserved — not written or read by the extension today. |

Example:

```jsonc
// .vscode/settings.json or user settings
{
  "utplsql.activeProfile": "dev",
  "utplsql.profiles": [
    {
      "id": "a1b2c3d4-...",
      "name": "DEV Local",
      "connection": "app@//localhost:1521/XEPDB1",
      "description": "Local development database",
      "charset": "utf8",
      "sourcePath": "src"
    },
    {
      "id": "e5f6g7h8-...",
      "name": "LEGACY Windows",
      "connection": "legacy@//old-db:1521/LEGACY",
      "description": "Legacy Windows-1252 database",
      "charset": "win1252",
      "sourcePath": "legacy/src"
    }
  ]
}
```

> The password is **not** stored here — it lives in the OS keychain (SecretStorage)
> and is recombined at connection time. Profiles saved before this change (with an
> inline password) are migrated automatically on first use.

## Running SQL scripts

Runs arbitrary SQL/PL/SQL scripts (migrations, seeds, setup) against a
connection profile chosen in a QuickPick after invocation — from the editor
(`utplsql.runScript`), by file (`utplsql.runScriptFile`) or by folder
(`utplsql.runScriptFolder`) in the Explorer. Output goes to the "utPLSQL
Script" OutputChannel, one line per statement. See [Commands](Commands).

| Setting | Default | Description |
|---|---|---|
| `utplsql.scriptRunner.stopOnError` | `true` | Stops on the first failure (`false` = keeps logging the rest). |
| `utplsql.scriptRunner.autoCommit` | `true` | `autoCommit` on each statement. |
| `utplsql.scriptRunner.filePattern` | `**/*.{sql,pks,pkb,fnc,prc,trg}` | Globs to list files when running a folder. |
| `utplsql.scriptRunner.dbmsOutput` | `false` | Captures and displays `DBMS_OUTPUT` during execution. |
| `utplsql.scriptRunner.timeoutSeconds` | `300` | Per-statement timeout in seconds (`callTimeout`). |

The profile `charset` applies to `runScriptFile`/`runScriptFolder` (files are
read as bytes and decoded). For `runScript` (editor) the text already comes
decoded by VSCode — the profile charset does not apply.

## Test Execution

| Setting | Default | Description |
|---|---|---|
| `utplsql.timeoutMinutes` | `60` | Timeout for a test run, in minutes (1–1440). On expiry the run is cancelled. |
| `utplsql.dbmsOutput` | `false` | Captures `DBMS_OUTPUT` from the test session and appends it to the run output. Best-effort; useful for debugging. |
| `utplsql.tags` | `""` | utPLSQL tag expression to filter which tests run (e.g. `fast & !integration`). Empty runs all. |
| `utplsql.run.randomOrder` | `false` | Runs the tests in random order to reveal order dependencies between them. |
| `utplsql.run.randomOrderSeed` | `0` | Seed for the random order. `0` = chosen by the database (not reproducible); > 0 reproduces the same order. |

## Coverage

| Setting | Default | Description |
|---|---|---|
| `utplsql.sourcePath` | `install` | Production code folder to map coverage. |
| `utplsql.coverageOwner` | `""` | Schema of covered objects. Empty = connection user. |
| `utplsql.coverage.schemes` | `[]` | Covered schemas (`a_coverage_schemes`). Empty = connection user (or `utplsql.coverageOwner`). |
| `utplsql.coverage.includeObjects` | `[]` | Objects to include in coverage, as `OWNER.NAME` (e.g. `["APP.MY_PKG"]`). Useful for dynamically reached objects. |
| `utplsql.coverage.excludeObjects` | `[]` | Objects to exclude from coverage, as `OWNER.NAME` (e.g. `["UT3.UT_COVERAGE"]`). |
| `utplsql.coverage.includeSchemaExpr` | `""` | Regex of schemas to include in coverage (e.g. `^APP$`). |
| `utplsql.coverage.includeObjectExpr` | `""` | Regex of objects to include in coverage. |
| `utplsql.coverage.excludeSchemaExpr` | `""` | Regex of schemas to exclude from coverage. |
| `utplsql.coverage.excludeObjectExpr` | `""` | Regex of objects to exclude from coverage (e.g. `^UT_` for the utPLSQL framework). |
| `utplsql.coverage.htmlReport` | `false` | Writes the utPLSQL HTML coverage report to `test-results/coverage.html` and offers **Open in Browser** / **Save As…** after the run (fire-and-forget; never rendered in a webview). |
| `utplsql.sqlCoverageEnabled` | `false` | Tracks views (SQL objects) via `V$SQL` after the run, marking them as executed/not executed. Requires `GRANT SELECT ON V$SQL`. Best-effort. |

## PL/SQL Debug

| Setting | Default | Description |
|---|---|---|
| `utplsql.debugger.enabled` | `true` | Enables PL/SQL test debugging via DBMS_DEBUG (Debug Adapter `utplsql`). |
| `utplsql.debugger.stopOnException` | `true` | Pauses execution when an unhandled exception is raised. |
| `utplsql.debugger.timeoutSeconds` | `300` | Debug session timeout in seconds. |
| `utplsql.debugger.compileOnDebug` | `false` | Compiles the object with debug information (`ALTER … COMPILE DEBUG PLSQL_OPTIMIZE_LEVEL = 1`) before starting the debug session. |

> Prerequisites: the target package must be compiled with debug info
> (`PLSQL_OPTIMIZE_LEVEL <= 1`, or `ALTER PACKAGE ... COMPILE DEBUG
> PLSQL_OPTIMIZE_LEVEL = 1`) and the
> user needs `GRANT DEBUG CONNECT SESSION` + `GRANT EXECUTE ON SYS.DBMS_DEBUG`.
> See [Database requirements](Database-requirements).

## Test Discovery

| Setting | Default | Description |
|---|---|---|
| `utplsql.includePatterns` | `["**/*.pks"]` | Additional globs to discover specs. Combined with `utplsql.discovery.languageIds` and `files.associations`. |
| `utplsql.discovery.languageIds` | `["plsql", "sql", "oracle-sql"]` | Language IDs treated as PL/SQL for discovery, CodeLens and decorations. Extensions come from the installed extensions and `files.associations`; use `["plsql"]` to avoid scanning `.sql`. |
| `utplsql.generate.testPackagePrefix` | `ut_` | Prefix of the generated test package name (`utplsql.generateTestSuite`). |
| `utplsql.generate.testPackageSuffix` | `""` | Suffix of the generated test package name. |
| `utplsql.generate.numberOfTestsPerUnit` | `1` | `%test` generated per routine of the production package (1–50). |
| `utplsql.generate.generateComments` | `true` | Adds a `-- TODO` comment to each generated `%test`. |
| `utplsql.showTestDuration` | `false` | Suffixes the duration of the last run to the test item labels (`(1.2s)`); the value is restored when the workspace is reopened. |
| `utplsql.discovery.source` | `auto` | Source of the test tree in `schema` mode: `auto` uses `ut_runner.get_suites_info` and falls back to `ALL_SOURCE`/files when unavailable; `database` requires the API; `file` disables database discovery. |

## Oracle Runner Pool

| Setting | Default | Description |
|---|---|---|
| `utplsql.oraclePoolMin` | `2` | Minimum connections kept in the pool (node-oracledb). |
| `utplsql.oraclePoolMax` | `10` | Maximum connections in the pool. |
| `utplsql.oraclePoolIncrement` | `1` | Increment when expanding the pool. |
| `utplsql.oraclePoolPingInterval` | `60` | Seconds between health checks for idle pool connections. `0` = ping on every checkout. |
| `utplsql.oracleClientMode` | `thin` | Driver mode: `thin` (default, pure JavaScript) or `thick` (Oracle Instant Client). Required for databases with NNE. |
| `utplsql.oracleClientLibDir` | `""` | Oracle Instant Client directory (required in `thick` mode). |
| `utplsql.oracleClientConfigDir` | `""` | Oracle config directory (TNS_ADMIN) with `sqlnet.ora`/`tnsnames.ora` (thick only). |
| `utplsql.connections.tnsAdminPath` | `""` | Directory with `tnsnames.ora` to resolve **TNS aliases in the thin driver**. Resolution: this setting → user/machine value of `sqldeveloper.connections.tnsConfiguration.path` → `TNS_ADMIN`. |

The pool is created **lazily** on the first Oracle execution, recreated when the
connection changes, and closed when the extension is deactivated. See [Direct Oracle Execution](Oracle-direct-execution).

## Reporters

| Setting | Default | Description |
|---|---|---|
| `utplsql.additionalReporters` | `[]` | Extra reporters included in every execution. See [Reporters](Reporters). |
| `utplsql.reporter.clientCharacterSet` | `""` | Client charset (`a_client_character_set`) for **utPLSQL: Run with Reporter (Export)**. Empty uses the reporter default. |
| `utplsql.reporter.colorConsole` | `false` | Enables ANSI color (`a_color_console`) for textual console reporters in the export. |

## UI (CodeLens, Status Bar, Decorations)

| Setting | Default | Description |
|---|---|---|
| `utplsql.codeLens.enabled` | `true` | CodeLens Run/Run with Coverage buttons above `%suite` and `%test`. |
| `utplsql.statusBar.enabled` | `true` | Status indicator in the status bar (pass/fail + duration). |
| `utplsql.decorations.enabled` | `true` | Inline ✓/✗/⚠ icons in the editor after execution. |
| `utplsql.compilationDiagnostics.enabled` | `true` | Publishes PL/SQL compilation errors (`ALL_ERRORS`) to the Problems Panel under the `utPLSQL Compilation` source, after each run. |
| `utplsql.setupDiagnostics.enabled` | `true` | Displays setup diagnostics (connection, grants, version) and utPLSQL installation integrity diagnostics (invalid objects, "Recompile UT3" quick-fix) with quick-fix. |

## Tree Organization

| Setting | Default | Description |
|---|---|---|
| `utplsql.organization` | `file` | `file` (by path), `schema` (Schema > Package > Suite > Test) or `tag` (Tag > Suite > Test, from `%tags`; a suite with several tags appears under each tag). |
| `utplsql.organization.schemaPattern` | `db/{schema}/**` | Glob pattern to extract schema from the path. Use `{schema}` as a placeholder. |
| `utplsql.showTagsInTree` | `false` | Appends the `%tags` of each suite/test as a `[tag1, tag2]` suffix on the Test Explorer label. |
| `utplsql.refreshDebounceMs` | `300` | Debounce (ms) to coalesce `.pks`/`.pkb` file watcher events before refreshing the Test Explorer. |

In `schema` mode with a configured connection (no prompt), the refresh also
discovers suites directly from the database (`ut_runner.get_suites_info`,
falling back to `ALL_OBJECTS`/`ALL_SOURCE`) for schemas whose
files are not in the workspace — the queried schemas are the directories
below the pattern root (e.g., `db/*`) and the schemas of local suites.
See [Tree Organization](Tree-organization).

## Auto-run on save (watch mode)

| Setting | Default | Description |
|---|---|---|
| `utplsql.autoRun` | `off` | `off` or `onSave` — re-runs the suites of the saved `.pks`. |
| `utplsql.autoRunDelayMs` | `500` | Debounce (ms) per file; rapid saves of the same file trigger a single run. |
| `utplsql.autoRunQueue` | `skip` | When an auto-run fires during a run: `skip` ignores it, `replace` reschedules it. |

## Language (i18n)

| Setting | Default | Description |
|---|---|---|
| `utplsql.language` | `auto` | Extension UI language. `auto` follows the VSCode language. Values: `auto`, `pt-br`, `en`, `en-gb`, `es`, `zh-cn`, `zh-tw`, `ja`, `de`, `fr`, `it`, `ko`, `ru`, `tr`, `pl`, `cs`, `hu`, `bg`, `el`, `id`, `ro`, `sr`, `th`, `uk`, `vi`. |

## Settings Hierarchy

VSCode applies settings in this order (the last one wins):

1. **Default** — extension default value
2. **User** — `%APPDATA%/Code/User/settings.json`
3. **Workspace** — project's `.vscode/settings.json`
4. **Workspace Folder** — for multi-root workspaces

Recommendation: put `sourcePath` in **workspace** (varies per project).
Keep `connection` **out** of settings.json (use env var).

## Full Example

```jsonc
// .vscode/settings.json
{
  // Coverage (project-specific)
  "utplsql.sourcePath": "install",

  // Connection: do NOT put it here — use env var UTPLSQL_CONN
  // "utplsql.connection": "DEV/password@//host:1521/XEPDB1"  ← AVOID

  // Extra reporters (optional)
  "utplsql.additionalReporters": ["UT_COVERAGE_HTML_REPORTER"]
}
```
