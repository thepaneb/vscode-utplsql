<p align="center">
  <img src="images/icon.png" alt="utPLSQL Test Runner Logo" width="128" height="128">
</p>

<div align="center">

**English** · [中文(简体)](README.zh-CN.md) · [中文(繁體)](README.zh-TW.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Español](README.es.md) · [Français](README.fr.md) · [Português](README.pt-BR.md) · [Italiano](README.it.md) · [Română](README.ro.md) · [Deutsch](README.de.md) · [Русский](README.ru.md) · [Polski](README.pl.md) · [Українська](README.uk.md) · [Čeština](README.cs.md) · [Български](README.bg.md) · [Српски](README.sr.md) · [Türkçe](README.tr.md) · [Ελληνικά](README.el.md) · [Magyar](README.hu.md) · [Bahasa Indonesia](README.id.md) · [Tiếng Việt](README.vi.md) · [ไทย](README.th.md) · [English (UK)](README.en-GB.md)

</div>

# utPLSQL Test Runner

Integrates [utPLSQL](https://www.utplsql.org/) into VSCode, bringing PL/SQL tests to the native **Test Explorer**, with context menu and visual coverage.

- 🧪 **Native Test Explorer** — suites and tests appear in the testing view; run by test, suite, file, or folder.
- 🔍 **CodeLens** — Run/Run with Coverage buttons over `%suite` and `%test` in the editor, without leaving your code.
- ⌨️ **Keyboard shortcuts** — `Ctrl+Shift+U` prefix + key for the main commands (R = Run All, T = Run File, L = Rerun Last, etc.).
- 🖱️ **Context menu** — right-click a **folder** or a **`.pks`/`.pkb`** file (in the Explorer or in the editor) to run tests.
- 📊 **Visual coverage** — colored gutters per line (covered/not covered) and per-file percentage in the **Coverage** tab.
- ✅ **Inline decorations** — ✓/✗/⚠ icons in the editor after execution, with failure tooltip and overview ruler.
- 📌 **Status Bar** — indicator with pass/fail count, duration, and real-time progress.
- 🔁 **Smart Re-run** — Rerun Last, Run at Cursor, Run Failed Only with a single shortcut.
- 🚀 **Oracle direct (via node-oracledb)** — real-time streaming, without waiting for the batch to finish.
- 🔧 **Setup diagnostics** — proactive validation of connection, grants, and version with quick-fix.
- 🧩 **Schema-aware tree** — organize tests by Schema > Package > Suite > Test in the Test Explorer.
- 🎯 **Jump to failure** — direct navigation to the line of the assertion that failed (via native "Go to Error").
- 🔌 **Connection profiles** — save and switch between multiple environments (DEV/TEST/PROD) with per-profile settings, via status bar or command palette.
- 📈 **Statement and view coverage** — the Coverage tab shows `% of statements` (PROCEDURE/FUNCTION) per file and tracks views executed via `V$SQL`.
- 🐛 **PL/SQL Debug** — breakpoints and step debugging of utPLSQL tests via `DBMS_DEBUG` (native Debug Adapter).
- 🌍 **i18n — 24 languages** — `utplsql.language` follows VSCode (15 native + 9 community: pt-br, en, en-gb, es, zh-cn, zh-tw, ja, de, fr, it, ko, ru, tr, pl, cs, hu, bg, el, id, ro, sr, th, uk, vi).

## Installation

The extension can be installed in two ways:

1. **From the Marketplace:** Search for **utPLSQL Test Runner** in the VSCode extensions panel (`Ctrl+Shift+X`) and click **Install**.
2. **Manually (.vsix):** Download the `.vsix` file of the desired version and install it in VSCode:
   * **Via Command Line:** `code --install-extension vscode-utplsql-<version>.vsix`
   * **Via Interface:** Open the Extensions panel (`Ctrl+Shift+X`), click the three dots `...` (top-right corner) and select **Install from VSIX...**.

## Requirements

- [**utPLSQL**](https://github.com/utPLSQL/utPLSQL) **(UT3)** installed in the Oracle database.
- **VSCode 1.88+** (Test Coverage API).

The extension connects directly to the Oracle database via `node-oracledb` (thin driver, no Instant Client required). The VSIX already includes the `oracledb` package.

## Connection

The extension needs an Oracle connection string to run tests. Resolution follows this order:

1. **Active connection profile** — `utplsql.activeProfile` pointing to a profile in `utplsql.profiles` (overrides everything below).
2. **`utplsql.connection` setting** — read from the project/user `settings.json`.
3. **`UTPLSQL_CONN` environment variable** — set before opening VSCode.
4. **Session cache** — if the user already typed the connection via prompt.
5. **Prompt to the user** — asks and keeps it only in the current session.

Connection profiles (`utplsql.profiles`) can also override `sourcePath`, `coverageOwner`, etc. per environment — see `utplsql.activeProfile` in the configuration table.

⚠️ **Security recommendation:** the connection string contains a password. **DO NOT** use the
`utplsql.connection` setting in shared environments (settings.json may be versioned or visible
to others). Instead, **use the `UTPLSQL_CONN` environment variable**:

```powershell
# PowerShell
$env:UTPLSQL_CONN = "user/password@//host:1521/service"
code .
```

```bash
# Bash
export UTPLSQL_CONN="user/password@//host:1521/service"
code .
```

If neither the setting nor the env var is defined, the extension asks for the connection and
keeps it only in memory during the session — use the command
**utPLSQL: Clear session connection** (command palette) to clear it.

**Accepted formats:**
- **EZ Connect**: `user/pass@//host:1521/service`
- **TNS alias**: `user/pass@tns_alias` (requires `TNS_ADMIN` configured)
- **Wallet (Oracle Cloud)**: `user/pass@tcps://host:1522/service?wallet_location=/path/wallet`

## How it works

The extension connects directly to the Oracle database via `node-oracledb`, streams test results in real-time, and translates them into VSCode's native APIs.

No temporary files, no waiting for the batch. Results appear in the
Test Explorer **as each test finishes**.

## Configuration

| Setting | Default | Description |
|---|---|---|
| `utplsql.connection` | `""` | Oracle connection. **Leave empty** and use the `UTPLSQL_CONN` environment variable to avoid storing the password. If both are empty, the extension asks (keeps it only in the session). |
| `utplsql.sourcePath` | `install` | Folder of the production code (to map coverage to files). |
| `utplsql.includePatterns` | `["**/*.pks"]` | Globs to discover the specs with `%suite`/`%test`. If your tests are in `.sql`, use `["**/*.sql"]`. |
| `utplsql.coverageOwner` | `""` | Schema owner of the covered objects. Empty = uses the connection user (uppercase). |
| `utplsql.timeoutMinutes` | `60` | Timeout in minutes for the test execution. |
| `utplsql.dbmsOutput` | `false` | Enables `DBMS_OUTPUT` in the test session. Useful for debugging. |
| `utplsql.additionalReporters` | `[]` | Additional reporters to include on every run (e.g. `["ut_coverage_html_reporter"]`). The defaults (documentation, junit, coverage) are always included and don't need to be listed. |
| `utplsql.codeLens.enabled` | `true` | Shows Run/Run with Coverage CodeLens buttons over `%suite` and `%test`. |
| `utplsql.statusBar.enabled` | `true` | Shows the test status indicator in the status bar. |
| `utplsql.decorations.enabled` | `true` | Shows pass/fail decorations on `%suite` and `%test` lines after execution. |
| `utplsql.oraclePoolMin` | `2` | Minimum connections kept in the Oracle runner pool (node-oracledb). |
| `utplsql.oraclePoolMax` | `10` | Maximum connections in the Oracle runner pool (node-oracledb). |
| `utplsql.oraclePoolIncrement` | `1` | Increment when expanding the Oracle runner pool (node-oracledb). |
| `utplsql.oraclePoolPingInterval` | `60` | Seconds between health checks of idle pool connections (node-oracledb). `0` = ping on every checkout. |
| `utplsql.organization` | `file` | Tree organization: `file` (by path) or `schema` (Schema > Package > Suite > Test). In `schema` mode, suites are also discovered from the database (`ALL_OBJECTS`/`ALL_SOURCE`) when `.pks` files are not in the workspace — with virtual URI `utplsql-db:/` (no CodeLens/decorations/jump to failure). |
| `utplsql.organization.schemaPattern` | `db/{schema}/**` | Glob pattern to extract the schema from the path. Use `{schema}` as the placeholder. In `schema` mode, the directories below the pattern base (e.g. `db/*`) define the schemas queried in the database. |
| `utplsql.compilationDiagnostics.enabled` | `true` | Shows PL/SQL compilation errors as underlines in the editor and Problems Panel. |
| `utplsql.setupDiagnostics.enabled` | `true` | Shows configuration diagnostics (connection, grants, version) and **utPLSQL installation integrity** (invalid objects in the UT3 schema, with "Recompile UT3" quick-fix) with quick-fix actions. |
| `utplsql.profiles` | `[]` | Saved Oracle connection profiles (name, connection, and overrides of `sourcePath`/`coverageOwner`/etc.) to switch between environments. (Full field reference: [wiki](https://github.com/thepaneb/vscode-utplsql/wiki/Configuration)). |
| `utplsql.activeProfile` | `""` | ID of the active profile (`utplsql.profiles`). When set, overrides `utplsql.connection`. |
| `utplsql.sqlCoverageEnabled` | `false` | Tracks views executed via `V$SQL` (boolean coverage). Requires `GRANT SELECT ON V$SQL`. |
| `utplsql.debugger.enabled` | `true` | Enables PL/SQL test debugging (`DBMS_DEBUG`). Requires `node-oracledb` + grants. |
| `utplsql.debugger.stopOnException` | `true` | Pauses on PL/SQL exceptions during debugging. |
| `utplsql.debugger.timeoutSeconds` | `300` | Timeout (s) of the debug session. |
| `utplsql.scriptRunner.stopOnError` | `true` | Stops script execution on the first failure (`false` = keeps logging the rest). |
| `utplsql.scriptRunner.autoCommit` | `true` | `autoCommit` on each script statement. |
| `utplsql.scriptRunner.filePattern` | `**/*.{sql,pks,pkb,fnc,prc,trg}` | Globs to list files when running a script folder. |
| `utplsql.scriptRunner.dbmsOutput` | `false` | Captures and displays `DBMS_OUTPUT` during script execution. |
| `utplsql.scriptRunner.timeoutSeconds` | `300` | Per-statement timeout (s) for scripts (`callTimeout`). |
| `utplsql.language` | `auto` | Language of the runtime messages. `auto` follows VSCode (pt, zh-tw/zh-hk, zh, es, ja, de, fr, it, ko, ru, tr, pl, cs, hu, bg, el, id, ro, sr, th, uk, vi, en-gb; otherwise en). Covers the **24 locales** (15 native + 9 community). |

Example (project `.vscode/settings.json`):

```jsonc
{
  "utplsql.sourcePath": "install",
  // utplsql.connection stays empty -> use the UTPLSQL_CONN environment variable
}
```

And, before opening VSCode (or in the PowerShell profile):

```powershell
$env:UTPLSQL_CONN = "DEV/password@//localhost:1521/XEPDB1"
```

### For contributors

Create a `.env` file at the project root (gitignored) with the environment
variables used by the integration tests:

```bash
UTPLSQL_CONN=your_user/password@//host:1521/service
```

## Usage

1. Open the PL/SQL project (with the code and test packages).
2. Compile the code and tests in the database (Oracle extension / SQLcl).
3. Open the **Testing** view → the suites appear.
4. Run:
   - Via **CodeLens** — ▶ Run/Run with Coverage buttons over each `%suite` and `%test` in the editor.
   - Via the **gutter** next to each test/suite, or
   - Via the **keyboard shortcuts** (`Ctrl+Shift+U R` = Run All, `Ctrl+Shift+U T` = Run File, etc.), or
   - The **Run Tests** button of the Test Explorer view, or
   - **Right-click** a folder/file → *utPLSQL: Run tests…* (with or without coverage).
5. After execution, see:
   - **Inline decorations** (✓/✗/⚠) in the editor next to the test annotations.
   - **Status Bar** with pass/fail count and total duration.
   - **Test Explorer** with detailed results.
6. For coverage, use the **Run with Coverage** profile (or the "with coverage" menu item).
7. To quickly repeat executions:
   - `Ctrl+Shift+U L` — **Rerun Last** (repeats the last execution, with or without coverage).
   - `Ctrl+Shift+U U` — **Run at Cursor** (runs the `%test`/`%suite` under the cursor).
   - `Ctrl+Shift+U X` — **Run Failed Only** (runs only the tests that failed).
8. For diagnostics, use `utPLSQL: Show information` in the palette — shows API/DB versions with a copy option.
9. **utPLSQL: Select additional reporter...** — QuickPick with the reporters available in the database.
10. **utPLSQL: Cancel execution** — stops the running execution (`Escape` during execution).
11. **utPLSQL: Refresh tests** — forces rediscovery of `.pks`.

> 💡 **When writing tests:** the parser is token-driven — just have `%suite`
> and the `create package` declaration in the file, and each `%test` followed by its
> `PROCEDURE`. There is no blank-line requirement.

### Supported annotations (v0.10.0+)

Besides `%suite` and `%test`, discovery understands:

| Annotation | Effect on the Test Explorer |
|---|---|
| `-- %disabled` | Suite or test **does not appear** in the tree (skipped in discovery) |
| `-- %throws(-20001)` | Marks that the test expects exception 20001 (`expectedError` metadata) |
| `-- %tags(fast, critical)` | Test tags (metadata; tag filtering is roadmap) |
| `-- %displayname(Name)` | Custom name displayed instead of the `%test` description |
| `-- %beforeall` / `%beforeeach` / `%aftereach` / `%afterall` | Marks the suite with lifecycle hooks (metadata) |

Annotations are case-insensitive. In the suite header (between `%suite` and the
first `%test`) they apply to the suite; after `%test`, they apply to the test.

## Commands

All extension commands (palette `Ctrl+Shift+P` prefix `utPLSQL:`):

| Command | Description | UI shortcut |
|---|---|---|
| `utPLSQL: Run all tests` | Runs all suites in the workspace | ▶ button in the Testing view |
| `utPLSQL: Run tests in this file` | Runs suites of the active `.pks`/`.pkb` | Right-click → file |
| `utPLSQL: Run tests in this file with coverage` | Same, with coverage profile | Right-click → file |
| `utPLSQL: Run tests in this folder` | Runs suites of the selected folder | Right-click → folder |
| `utPLSQL: Run tests in this folder with coverage` | Same, with coverage profile | Right-click → folder |
| `utPLSQL: Refresh tests` | Forces rediscovery of `.pks` | — |
| `utPLSQL: Cancel execution` | Stops the running execution | — |
| `utPLSQL: Show utPLSQL information` | API/DB versions with copy option | — |
| `utPLSQL: Select additional reporter...` | QuickPick with database reporters | — |
| `utPLSQL: Clear session connection` | Removes the connection from the session cache | — |
| `utPLSQL: Rerun Last` | Repeats the last execution | `Ctrl+Shift+U L` |
| `utPLSQL: Run Test at Cursor` | Runs the test under the cursor | `Ctrl+Shift+U U` |
| `utPLSQL: Run Failed Tests` | Re-runs only the failed tests | `Ctrl+Shift+U X` |
| `utPLSQL: Validate configuration` | Runs full setup validation (connection, UT3 installation) and shows results | — |
| `utPLSQL: Configure connection` | Opens settings at `utplsql.connection` | — |
| `utPLSQL: Copy coverage grants to clipboard` | Copies the grants SQL to the clipboard | — |
| `utPLSQL: Show Test Explorer` | Focuses the Testing view | — |
| `utPLSQL: Switch connection profile...` | Switches the active connection profile (QuickPick) | Click on the status bar (with active profile) |
| `utPLSQL: New connection profile...` | Wizard to create and activate a profile | — |
| `utPLSQL: Manage connection profiles` | Opens settings at `utplsql.profiles` | — |
| `utPLSQL: Import connections from SQL Developer` | Imports connections from SQL Developer (connections.xml) | — |
| `utPLSQL: Debug test (PL/SQL)` | Starts a debug session of the test under the active file | — |
| `utPLSQL: Run script` | Runs the script open in the editor against a connection profile | Right-click → script file |
| `utPLSQL: Run script file` | Runs an Explorer script file (decoded with the profile charset) | Right-click → file |
| `utPLSQL: Run script folder` | Runs the folder scripts in alphabetical order | Right-click → folder |

> **Recompile UT3** (`utplsql.recompileUt3`) is **not** a palette command — it is
> an internal quick-fix of the "utPLSQL Setup" diagnostic (invalid objects in the
> utPLSQL schema).

## Keybindings

All shortcuts use the `Ctrl+Shift+U` prefix (`Cmd+Shift+U` on Mac):

| Shortcut | Command |
|---|---|
| `Ctrl+Shift+U R` | Run all tests |
| `Ctrl+Shift+U T` | Run tests in file |
| `Ctrl+Shift+U Shift+T` | Run tests in file with coverage |
| `Ctrl+Shift+U F` | Refresh tests |
| `Ctrl+Shift+U I` | Show utPLSQL information |
| `Ctrl+Shift+U C` | Clear session connection |
| `Ctrl+Shift+U L` | Rerun last |
| `Ctrl+Shift+U U` | Run at cursor |
| `Ctrl+Shift+U X` | Run failed only |
| `Escape` | Cancel execution |

## Coverage

- **Executed** lines turn green in the gutter; **not executed** lines turn red.
- The **Test Coverage** tab shows the **percentage per file/folder**.



Coverage is collected via `ut_file_mapper.build_file_mappings()` and reported via
`ut_coverage_cobertura_reporter`. The extension maps covered objects to source files
automatically using the `utplsql.sourcePath` setting and the `utplsql.coverageOwner`
schema.

## Reporters

The extension always includes three default reporters:
`ut_documentation_reporter` (stdout),
`ut_junit_reporter` (results → Test Explorer) and
`ut_coverage_cobertura_reporter` (coverage, if available).

**Dynamic validation** — before running with coverage, the extension queries
the database via `ALL_OBJECTS` to verify that `UT_COVERAGE_COBERTURA_REPORTER`
exists. If it doesn't (e.g. outdated utPLSQL), coverage is skipped with a warning
in the output. Test execution is never blocked.

**Additional fixed reporters** — setting `utplsql.additionalReporters`:
```jsonc
"utplsql.additionalReporters": ["UT_COVERAGE_HTML_REPORTER"]
```
The three default reporters are automatically deduplicated, even if
listed here.

**Volatile per-session reporter** — command **utPLSQL: Select additional
reporter...** opens a QuickPick with the dynamic list from the database. The
chosen reporter is used on the next execution and discarded afterwards (does not
persist in settings).

## Database requirements

**Coverage** (always) — enables the profiler:
```sql
GRANT EXECUTE ON SYS.DBMS_PROFILER TO <schema_that_runs_the_tests>;
GRANT EXECUTE ON SYS.DBMS_PLSQL_CODE_COVERAGE TO <schema_that_runs_the_tests>;
```
Without this, tests run but coverage comes out **empty**.

**Test discovery in OTHER schemas** (utPLSQL **shared** install, e.g. owner `UT3`):
for the framework to see and parse the tests of the application schemas, the utPLSQL owner needs
to **read the dictionary** of those schemas:
```sql
GRANT SELECT ON SYS.DBA_SOURCE     TO <ut3_owner>;
GRANT SELECT ON SYS.DBA_OBJECTS    TO <ut3_owner>;
GRANT SELECT ON SYS.DBA_PROCEDURES TO <ut3_owner>;
```
- **`SELECT ANY DICTIONARY` alone is NOT enough** — it needs the **direct** grants on those views
  (because of `dbms_assert.sql_object_name` in definer context).
- The utPLSQL **DDL trigger** must also be installed (keeps the annotation cache up to date).
- Verification (as the owner): `SELECT ut_metadata.get_source_view_name FROM dual;` should return `dba_source`.

> In **per-schema** installs (utPLSQL in the same schema as the tests), these cross-schema grants **are**
> not needed — the framework reads its own source.

## Known limitations

- The result→test mapping is done by package name + test name/description;
  identical descriptions in different packages can create ambiguity (the index is
  scoped by package to minimize this).
- Considers the **first** workspace folder to resolve `sourcePath`.
- Discovery reads the `.pks` (specs); keep the `%suite`/`%test` annotations in the spec.

## Troubleshooting

| Symptom | Likely cause | Solution |
|---|---|---|
| Suites don't appear | Connection issue | Run `utPLSQL: Validate configuration` for diagnostics |
| Empty coverage | Missing `GRANT EXECUTE ON DBMS_PROFILER` | Run the grants in [Requirements](#database-requirements) or use `utPLSQL: Copy coverage grants to clipboard` |
| Empty coverage | Oracle 19c requires additional grants | `GRANT EXECUTE ON DBMS_PROFILER` + `GRANT EXECUTE ON DBMS_PLSQL_CODE_COVERAGE` |
| Compilation error with no indication | Code with PL/SQL syntax error | Enable `utplsql.compilationDiagnostics.enabled` (default on); see Problems Panel |
| Connection error | Malformed string or unreachable DB | Use `utPLSQL: Validate configuration` |
| Timeout while running | Tests take longer than `timeoutMinutes` | Increase `utplsql.timeoutMinutes` |
| `%suite` not recognized | Missing `%suite`/`create package` in the file, or `%test` without `PROCEDURE` | Check the spec; run `utPLSQL: Refresh tests` |
| CodeLens doesn't appear | `editor.codeLens` disabled or conflict | Enable `"editor.codeLens": true`; check `utplsql.codeLens.enabled` |
| Shortcuts don't work | Conflict with another extension or VSCode shortcut | Go to File → Preferences → Keyboard Shortcuts and search for `utplsql` to redefine |

## License

MIT © Gil Cleber Barboza
