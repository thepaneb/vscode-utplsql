<!-- GENERATED FROM docs/brain/60-README/README (extensão).md — DO NOT EDIT -->

<p align="center">
  <img src="images/icon.png" alt="utPLSQL Test Runner Logo" width="128" height="128">
</p>

<div align="center">

**English** · [中文(简体)](README.zh-CN.md) · [中文(繁體)](README.zh-TW.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Español](README.es.md) · [Français](README.fr.md) · [Português](README.pt-BR.md) · [Italiano](README.it.md) · [Română](README.ro.md) · [Deutsch](README.de.md) · [Русский](README.ru.md) · [Polski](README.pl.md) · [Українська](README.uk.md) · [Čeština](README.cs.md) · [Български](README.bg.md) · [Српски](README.sr.md) · [Türkçe](README.tr.md) · [Ελληνικά](README.el.md) · [Magyar](README.hu.md) · [Bahasa Indonesia](README.id.md) · [Tiếng Việt](README.vi.md) · [ไทย](README.th.md) · [English (UK)](README.en-GB.md)

</div>

<p align="center">
  <a href="https://marketplace.visualstudio.com/items?itemName=paneb.vscode-utplsql"><img alt="Marketplace" src="https://vsmarketplacebadges.dev/version-short/paneb.vscode-utplsql.svg"></a>
  <a href="https://marketplace.visualstudio.com/items?itemName=paneb.vscode-utplsql"><img alt="Installs" src="https://vsmarketplacebadges.dev/installs-short/paneb.vscode-utplsql.svg"></a>
  <a href="https://marketplace.visualstudio.com/items?itemName=paneb.vscode-utplsql"><img alt="Downloads" src="https://vsmarketplacebadges.dev/downloads-short/paneb.vscode-utplsql.svg"></a>
  <a href="https://github.com/thepaneb/vscode-utplsql/actions/workflows/ci.yml"><img alt="CI" src="https://github.com/thepaneb/vscode-utplsql/actions/workflows/ci.yml/badge.svg"></a>
  <a href="https://codecov.io/gh/thepaneb/vscode-utplsql"><img alt="Coverage" src="https://codecov.io/gh/thepaneb/vscode-utplsql/branch/main/graph/badge.svg"></a>
  <img alt="VS Code" src="https://img.shields.io/badge/VS%20Code-1.125%2B-007ACC">
  <img alt="Node" src="https://img.shields.io/badge/node-22-339933?logo=nodedotjs&logoColor=white">
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-7-3178C6?logo=typescript&logoColor=white">
  <img alt="Oracle" src="https://img.shields.io/badge/Oracle-12.2%2B-F80000?logo=oracle&logoColor=white">
  <img alt="License" src="https://img.shields.io/badge/license-MIT-blue">
  <a href="https://thepaneb.github.io/vscode-utplsql/"><img alt="Website" src="https://img.shields.io/badge/Website-vscode--utplsql-007ACC"></a>
</p>

# utPLSQL Test Runner

Run and debug **utPLSQL** (Oracle PL/SQL) tests right in VS Code — native **Test Explorer**, visual coverage, a PL/SQL debugger and **Oracle-direct** execution via `node-oracledb`. Available in **24 UI languages**; requires **VS Code 1.125+** (Node 24).

### Test Explorer & execution

- 🧪 **Native Test Explorer** — suites and tests appear in the testing view; run by test, suite, file, or folder.
- 🔍 **CodeLens** — Run/Run with Coverage buttons over `%suite` and `%test` in the editor, without leaving your code.
- 🧬 **PL/SQL language identity** — discovery, CodeLens and decorations honor `utplsql.discovery.languageIds` (default `plsql`, `sql`, `oracle-sql`) and `files.associations`, so `.pls`, `.plb`, `.tps`, `.tpb`, `.vw` and custom extensions work too.
- ✂️ **Snippets** — `ut-` snippets for the utPLSQL annotations (`%suite`, `%test`, `%context`, lifecycle, `%tags`/`%throws`) and the main `ut.expect` matchers, available in `sql` and `plsql`.
- ⌨️ **Keyboard shortcuts** — `Ctrl+Shift+U` prefix + key for the main commands (R = Run All, T = Run File, L = Rerun Last, etc.).
- 🖱️ **Context menu** — right-click a **folder** or a **`.pks`/`.pkb`** file (in the Explorer or in the editor) to run tests.
- 🔁 **Smart Re-run** — Rerun Last, Run at Cursor, Run Failed Only with a single shortcut.
- 🧩 **Schema-aware tree** — organize tests by Schema > Package > Suite > Test in the Test Explorer.
- 🏷️ **Tags and random order** — filter tests with `utplsql.tags` (e.g. `fast & !integration`) or the `utPLSQL: Run Tests by Tag...` command (multi-select QuickPick; `!tag` excludes), and run in random order with a reproducible seed (`utplsql.run.randomOrder`).
- 🧭 **Tag-based tree** — organize the Test Explorer as **Tag > Suite > Test** with `utplsql.organization = tag` (a suite with several tags appears under each tag) and show `[tag1, tag2]` on the labels with `utplsql.showTagsInTree`.
- 🏗️ **Test suite scaffold** — generates `ut_<package>.pks` with one `%test` per routine from a `.pks`/`.pkb` or a database object, using the `utplsql.generate.*` options.
- ⏱️ **Duration and persistence** — the last run result (status, message and per-test duration) survives a workspace reload; optionally shows `(1.2s)` on the test labels (`utplsql.showTestDuration`).
- 🔗 **Run Related Tests** — on a production `.pks`/`.pkb`/`.sql`, runs the suites that follow the `ut_<object>` convention (`Ctrl+Shift+U Shift+R`).
- ♻️ **Auto-run on save** — re-run the suites of the saved `.pks` with `utplsql.autoRun = onSave`, with a per-file debounce (`utplsql.autoRunDelayMs`) and a queue policy when a run is in progress (`utplsql.autoRunQueue`: `skip`/`replace`).
- 🗄️ **Database-first discovery** — build the tree from `ut_runner.get_suites_info` and rebuild the annotation cache from the palette.
- 🌳 **Lazy test tree** — in `schema` mode, packages/suites/tests are resolved on demand when you expand, so large schemas open instantly.
- 📁 **Multi-root workspace** — every workspace folder gets its own suites, with independent discovery, execution and coverage.
- 🚀 **Oracle direct (via node-oracledb)** — real-time streaming, without waiting for the batch to finish.
- 📜 **SQL scripts** — run the current script, an Explorer file, or a whole folder against the active connection profile (charset-aware, with `DBMS_OUTPUT` and `stopOnError`).

### Coverage

- 📊 **Visual coverage** — colored gutters per line (covered/not covered) and per-file percentage in the **Coverage** tab.
- 📈 **Statement and view coverage** — the Coverage tab shows `% of statements` (PROCEDURE/FUNCTION) per file and tracks views executed via `V$SQL`.
- 🎯 **Coverage scope** — include/exclude objects and schema/object regexes (`utplsql.coverage.*`) to drop framework noise and add dynamically reached objects.
- 🗂️ **Virtual database source** — with no local file, *jump to failure* and coverage open a read-only document resolved from `ALL_SOURCE` (`utplsql-source:/…`).
- 🧾 **HTML coverage report** — with `utplsql.coverage.htmlReport`, the run writes `test-results/coverage.html` and offers **Open in Browser** / **Save to file…** without blocking the Test Explorer.

### Debugger

- 🐛 **PL/SQL Debug** — breakpoints and step debugging of utPLSQL tests via `DBMS_DEBUG` (native Debug Adapter); debug **at cursor**, the **failed** tests or the **last run** from the palette (`utPLSQL: Debug Test at Cursor`, `Debug Failed Tests`, `Debug Last Run`).

### Connections & security

- 🔌 **Connection profiles** — save and switch between multiple environments (DEV/TEST/PROD) with per-profile settings, via status bar or command palette.
- 🔐 **TNS in thin + wallet** — `utplsql.connections.tnsAdminPath` resolves `tnsnames.ora` aliases in the thin driver (fallback to SQL Developer/`TNS_ADMIN`); the profile `walletLocation` and `utPLSQL: Set wallet password` keep the wallet password in the SecretStorage.
- 🔒 **Connection security hardening** — connection settings are `machine`-scoped, the extension is disabled in untrusted workspaces, and the profile password is bound to the connection.
- 🔧 **Setup diagnostics** — proactive validation of connection, grants, and version with quick-fix.

### Reporting

- 🧾 **Run with Reporter (Export)** — run the selection with any database reporter and write the output to the Output panel or a file (`utplsql.reporter.*`), without changing the Test Explorer results.

### UX & diagnostics

- ✅ **Inline decorations** — ✓/✗/⚠ icons in the editor after execution, with failure tooltip and overview ruler.
- 🔬 **Inline expected × actual diff** — on assertion failures, the Test Explorer shows VS Code's **native diff** with the *Expected*/*Actual* values extracted from the reporter message.
- 📌 **Status Bar** — indicator with pass/fail count, duration and real-time progress; click the **coverage toggle** to switch the session coverage mode (`utPLSQL: Toggle Coverage`).
- 🎯 **Jump to failure** — direct navigation to the line of the assertion that failed (via native "Go to Error").
- 🧱 **Compilation diagnostics** — after every run, PL/SQL compilation errors (`ALL_ERRORS`) show up in the Problems Panel under the `utPLSQL Compilation` source (setting `utplsql.compilationDiagnostics.enabled`).
- ⏳ **Progress and cancellation** — long runs show a progress notification with counts and a *Cancel* button (plus the optional `utplsql.timeoutMinutes`).
- 🌍 **i18n — 24 languages** — `utplsql.language` follows VSCode (24 locales: pt-br, en, en-gb, es, zh-cn, zh-tw, ja, de, fr, it, ko, ru, tr, pl, cs, hu, bg, el, id, ro, sr, th, uk, vi).


## Installation

The extension can be installed in two ways:

1. **From the Marketplace:** Search for **utPLSQL Test Runner** in the VSCode extensions panel (`Ctrl+Shift+X`) and click **Install**.
2. **Manually (.vsix):** Download the `.vsix` file of the desired version and install it in VSCode:
   * **Via Command Line:** `code --install-extension vscode-utplsql-<version>.vsix`
   * **Via Interface:** Open the Extensions panel (`Ctrl+Shift+X`), click the three dots `...` (top-right corner) and select **Install from VSIX...**.

## Requirements

- [**utPLSQL**](https://github.com/utPLSQL/utPLSQL) **(UT3)** installed in the Oracle database.
- **VSCode 1.125+** (Node 24).

The extension connects directly to the Oracle database via `node-oracledb` (thin driver, no Instant Client required). The VSIX already includes the `oracledb` package.

**Oracle / utPLSQL compatibility:**

| Oracle | utPLSQL | Notes |
|---|---|---|
| 18c+ | v3.2.x (18c+) / v3.1.x | Recommended; `AL32UTF8` character set. |
| 12.2 | v3.1.x only | v3.2.x fails to compile (`PLS-00222` on `UT_ANNOTATION_MANAGER`). The image's `WE8DEC` character set loses non-representable characters (e.g. `€`) — the thin driver ignores `NLS_LANG`. |
| 11.2 (11g R2) | v3.1.x only | **Thick mode required** (thin starts at 12.1; Instant Client **19c+**); coverage via `DBMS_PROFILER`. |

Thick mode requires Oracle Instant Client **19c+** (node-oracledb 7); the 11g
axis in the matrix uses Instant Client 23.0.

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
- **TNS alias**: `user/pass@tns_alias` — the **thin** driver resolves the alias from
  `utplsql.connections.tnsAdminPath`, then the user/machine value of
  `sqldeveloper.connections.tnsConfiguration.path`, then `TNS_ADMIN` (see the setting below).
- **Wallet (Oracle Cloud)**: `user/pass@tcps://host:1522/service?wallet_location=/path/wallet`

> 🔒 **Hardened settings:** `utplsql.connection`, `utplsql.profiles`, `utplsql.activeProfile`,
> `utplsql.oracleClientLibDir`, `utplsql.oracleClientConfigDir` and
> `utplsql.connections.tnsAdminPath` are **`machine`-scoped** —
> a project's `.vscode/settings.json` cannot override them. The extension is also **disabled in
> untrusted workspaces** (mark the folder as trusted to enable it). A profile password is bound
> to its `connection`: if the connection changes, the stored password is discarded instead of
> being sent to the new host.

## How it works

The extension connects directly to the Oracle database via `node-oracledb`, streams test results in real-time, and translates them into VSCode's native APIs.

No temporary files, no waiting for the batch. Results appear in the
Test Explorer **as each test finishes**.

## Commands

<!-- brain:auto:start:commands -->
| Command | ID | Description | UI shortcut |
|---|---|---|---|
| `Show Test Explorer` | `utplsql.showTestExplorer` | Focuses the Testing view | — |
| `Run test (CodeLens)` | `utplsql.runLens` | Internal — triggered by CodeLens buttons | ▶ button over `%suite`/`%test` |
| `Refresh tests` | `utplsql.refresh` | Forces rediscovery of `.pks` files | — |
| `Run all tests` | `utplsql.runAll` | Runs all suites in the workspace | ▶ button in Testing view |
| `utPLSQL: Run tests in this file` | `utplsql.runFile` | Runs suites from the active `.pks`/`.pkb` | Right-click → file |
| `utPLSQL: Run tests in this file (with coverage)` | `utplsql.runFileCoverage` | Same, with coverage profile | Right-click → file |
| `utPLSQL: Run tests in this folder` | `utplsql.runFolder` | Runs suites from the selected folder | Right-click → folder |
| `utPLSQL: Run tests in this folder (with coverage)` | `utplsql.runFolderCoverage` | Same, with coverage profile | Right-click → folder |
| `Cancel run` | `utplsql.cancelRun` | Stops the current execution | `Escape` |
| `Clear session connection` | `utplsql.clearConnection` | Removes connection from cache | — |
| `Show utPLSQL info` | `utplsql.showInfo` | API/DB versions | — |
| `Select additional reporter...` | `utplsql.selectReporter` | QuickPick with database reporters | — |
| `utPLSQL: Rerun Last` | `utplsql.rerunLast` | Repeats the last run | `Ctrl+Shift+U L` |
| `utPLSQL: Run Test at Cursor` | `utplsql.runAtCursor` | Runs the test under the cursor | `Ctrl+Shift+U U` |
| `utPLSQL: Run Failed Tests` | `utplsql.runFailed` | Re-runs only failed tests | `Ctrl+Shift+U X` |
| `utPLSQL: Toggle Coverage` | `utplsql.toggleCoverage` | Toggles the session coverage mode used by run commands without explicit coverage | Click on the status bar item |
| `utPLSQL: Run Tests by Tag...` | `utplsql.runByTag` | Multi-select QuickPick of discovered `%tags`; a `!tag` entry excludes it | — |
| `Configure connection` | `utplsql.configureConnection` | Opens settings at `utplsql.connection` | — |
| `Copy coverage grants to clipboard` | `utplsql.copyGrantsToClipboard` | Copies SQL grants to clipboard | — |
| `Validate setup` | `utplsql.validateSetup` | Runs full setup validation (including UT3 installation integrity) | — |
| `Switch Connection Profile...` | `utplsql.switchProfile` | QuickPick to switch the active connection profile | Click on status bar |
| `New Connection Profile...` | `utplsql.newProfile` | Creates a new connection profile | — |
| `Manage Connection Profiles` | `utplsql.manageProfiles` | Opens saved connection profiles | — |
| `utPLSQL: Set wallet password` | `utplsql.setWalletPassword` | Sets or clears the active profile's Oracle Cloud wallet password (stored in SecretStorage) | — |
| `utPLSQL: Run with Reporter (Export)` | `utplsql.runWithReporter` | Runs the selection with a chosen database reporter and writes the output to a dedicated Output channel or a file (`utplsql.reporter.*` settings) | Test Explorer item context menu |
| `Import SQL Developer Connections` | `utplsql.importSqlDevConnections` | Imports SQL Developer connections as profiles | — |
| `Debug Test (PL/SQL)` | `utplsql.debugTest` | Starts debugging a test via DBMS_DEBUG (`utplsql` Debug Adapter) | Editor context menu (`.pks`/`.pkb`) |
| `utPLSQL: Debug Test at Cursor` | `utplsql.debugAtCursor` | Starts a debug session of the `%test`/`%suite` under the cursor | — |
| `utPLSQL: Debug Failed Tests` | `utplsql.debugFailed` | Starts a debug session of the tests that failed in the last run (QuickPick when several) | — |
| `utPLSQL: Debug Last Run` | `utplsql.debugLast` | Starts a debug session of the last run | — |
| `utPLSQL: Compile for Debug` | `utplsql.compileForDebug` | Compiles the selected file/folder object with debug information (`ALTER … COMPILE DEBUG PLSQL_OPTIMIZE_LEVEL = 1`) | Editor/Explorer context menu |
| `utPLSQL: Rebuild Annotation Cache` | `utplsql.rebuildAnnotations` | Rebuilds the utPLSQL annotation cache in the database (`ut_runner.rebuild_annotation_cache`) and refreshes the tree | — |
| `utPLSQL: Run script` | `utplsql.runScript` | Runs the script open in the editor against a profile (connection QuickPick) | Right-click → `.sql`/`.pks`/`.pkb`/`.fnc`/`.prc`/`.trg` file |
| `utPLSQL: Run script file` | `utplsql.runScriptFile` | Runs an Explorer script file (decoded with the profile `charset`) | Right-click → file |
| `utPLSQL: Run script folder` | `utplsql.runScriptFolder` | Runs the folder scripts in alphabetical order (`utplsql.scriptRunner.filePattern` filter) | Right-click → folder |
| `utPLSQL: Generate test suite…` | `utplsql.generateTestSuite` | Generates `ut_<package>.pks` from a `.pks`/`.pkb` or a database object — one `%test` per routine, with the `utplsql.generate.*` settings | — |
| `utPLSQL: Run Related Tests` | `utplsql.runRelated` | Runs the suites related to the active production file, by the `ut_<object>` naming convention | Right-click → file |
<!-- brain:auto:end -->

## Configuration

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
| `utplsql.oracleClientLibDir` | `""` | Oracle Instant Client directory. Required when `utplsql.oracleClientMode` is `thick` (e.g. `C:\\\\oracle\\\\instantclient_23_5`). Falls back to the `ORACLE_CLIENT_LIB_DIR` environment variable when empty. |
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
10. **utPLSQL: Cancel run** — stops the running execution (`Escape` during execution).
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
| `-- %tags(fast, critical)` | Test tags; filter the run with the `utplsql.tags` setting (e.g. `fast & !integration`) |
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
| `utPLSQL: Cancel run` | Stops the running execution | — |
| `utPLSQL: Show utPLSQL info` | API/DB versions with copy option | — |
| `utPLSQL: Select additional reporter...` | QuickPick with database reporters | — |
| `utPLSQL: Clear session connection` | Removes the connection from the session cache | — |
| `utPLSQL: Rerun Last` | Repeats the last execution | `Ctrl+Shift+U L` |
| `utPLSQL: Run Test at Cursor` | Runs the test under the cursor | `Ctrl+Shift+U U` |
| `utPLSQL: Run Failed Tests` | Re-runs only the failed tests | `Ctrl+Shift+U X` |
| `utPLSQL: Toggle Coverage` | Toggles the session coverage mode applied by run commands without explicit coverage | Click on the status bar item |
| `utPLSQL: Run Tests by Tag...` | Runs the suites/tests matching the selected `%tags` (`!tag` excludes) | — |
| `utPLSQL: Validate setup` | Runs full setup validation (connection, UT3 installation) and shows results | — |
| `utPLSQL: Configure connection` | Opens settings at `utplsql.connection` | — |
| `utPLSQL: Copy coverage grants to clipboard` | Copies the grants SQL to the clipboard | — |
| `utPLSQL: Show Test Explorer` | Focuses the Testing view | — |
| `utPLSQL: Switch connection profile...` | Switches the active connection profile (QuickPick) | Click on the status bar (with active profile) |
| `utPLSQL: New connection profile...` | Wizard to create and activate a profile | — |
| `utPLSQL: Manage connection profiles` | Opens settings at `utplsql.profiles` | — |
| `utPLSQL: Import connections from SQL Developer` | Imports connections from SQL Developer (connections.xml) | — |
| `utPLSQL: Set wallet password` | Sets or clears the active profile's Oracle Cloud wallet password (stored in SecretStorage) | — |
| `utPLSQL: Run with Reporter (Export)` | Runs the selection with a chosen database reporter and writes the output to Output/file (does not change Test Explorer results) | Test Explorer item context menu |
| `utPLSQL: Debug test (PL/SQL)` | Starts a debug session of the test under the active file | Editor context menu |
| `utPLSQL: Debug Test at Cursor` | Starts a debug session of the `%test`/`%suite` under the cursor | — |
| `utPLSQL: Debug Failed Tests` | Starts a debug session of the tests that failed in the last run (QuickPick when several) | — |
| `utPLSQL: Debug Last Run` | Starts a debug session of the last run | — |
| `utPLSQL: Compile for Debug` | Compiles the selected file/folder object with debug information | Editor/Explorer context menu |
| `utPLSQL: Rebuild Annotation Cache` | Rebuilds the utPLSQL annotation cache in the database and refreshes the tree | — |
| `utPLSQL: Run script` | Runs the script open in the editor against a connection profile | Right-click → script file |
| `utPLSQL: Run script file` | Runs an Explorer script file (decoded with the profile charset) | Right-click → file |
| `utPLSQL: Run script folder` | Runs the folder scripts in alphabetical order | Right-click → folder |
| `utPLSQL: Generate test suite` | Generates `ut_<package>.pks` from a `.pks`/`.pkb` or a database object (one `%test` per routine) | Right-click → file / Code Action |
| `utPLSQL: Run Related Tests` | Runs the suites related to the active production file, by the `ut_<object>` convention | Right-click → file |

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
| `Ctrl+Shift+U I` | Show utPLSQL info |
| `Ctrl+Shift+U C` | Clear session connection |
| `Ctrl+Shift+U L` | Rerun last |
| `Ctrl+Shift+U U` | Run at cursor |
| `Ctrl+Shift+U X` | Run failed only |
| `Ctrl+Shift+U Shift+R` | Run related tests |
| `Ctrl+Shift+U Shift+C` | Toggle coverage |
| `Ctrl+Shift+U D` | Debug test at cursor |
| `Ctrl+Shift+U Shift+D` | Debug failed tests |
| `Escape` | Cancel run |

## Coverage

- **Executed** lines turn green in the gutter; **not executed** lines turn red.
- The **Test Coverage** tab shows the **percentage per file/folder**.



Coverage is reported via `ut_coverage_cobertura_reporter` and mapped to source files
automatically using the `utplsql.sourcePath` setting and the `utplsql.coverageOwner`
schema. The extension resolves `package`, `package body`, `function`, `procedure`,
`type body`, `trigger` and `view` objects, trying `.sql`, `.pks`, `.pkb`, `.prc`,
`.fnc`, `.trg`, `.tpb`, `.bdy` and `.typ` under the source folders.

## Reporters

The extension always includes two default reporters:
`ut_documentation_reporter` (stdout) and
`ut_junit_reporter` (results → Test Explorer). The
`ut_coverage_cobertura_reporter` is added **only when running with coverage**.

**Dynamic validation** — before running with coverage, the extension queries
the database via `TABLE(ut_runner.get_reporters_list())` to verify that
`UT_COVERAGE_COBERTURA_REPORTER` exists. If it doesn't (e.g. outdated utPLSQL),
coverage is skipped with a warning in the output. Test execution is never blocked.

**Additional fixed reporters** — setting `utplsql.additionalReporters`:
```jsonc
"utplsql.additionalReporters": ["UT_COVERAGE_HTML_REPORTER"]
```
The default reporters are automatically deduplicated, even if
listed here.

**Volatile per-session reporter** — command **utPLSQL: Select additional
reporter...** opens a QuickPick with the dynamic list from the database. The
chosen reporter is stored in the session and **applied to the next run**
(`consumeExtraReporter()`, logged as `[info] Reporter adicional da sessão`).

## Database requirements

**Coverage** — enables the profiler:
```sql
-- 12.2+ (also 19c/23ai)
GRANT EXECUTE ON SYS.DBMS_PROFILER TO <schema_that_runs_the_tests>;
GRANT EXECUTE ON SYS.DBMS_PLSQL_CODE_COVERAGE TO <schema_that_runs_the_tests>;
-- 11.2 (11g): only DBMS_PROFILER (DBMS_PLSQL_CODE_COVERAGE is 12.2+)
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
- Discovery reads the `.pks` (specs); keep the `%suite`/`%test` annotations in the spec.

## Troubleshooting

| Symptom | Likely cause | Solution |
|---|---|---|
| Suites don't appear | Connection issue | Run `utPLSQL: Validate setup` for diagnostics |
| Empty coverage | Missing `GRANT EXECUTE ON DBMS_PROFILER` | Run the grants in [Requirements](#database-requirements) or use `utPLSQL: Copy coverage grants to clipboard` |
| Empty coverage | Oracle 12.2+ requires additional grants | `GRANT EXECUTE ON DBMS_PROFILER` + `GRANT EXECUTE ON DBMS_PLSQL_CODE_COVERAGE` (11g: only `DBMS_PROFILER`) |
| Compilation error with no indication | Code with PL/SQL syntax error | Keep `utplsql.compilationDiagnostics.enabled` on (default); errors from `ALL_ERRORS` appear in the Problems Panel after a run |
| Connection error | Malformed string or unreachable DB | Use `utPLSQL: Validate setup` |
| Connection error / `ORA-12660` / `NJS-500` | Database requires NNE (Native Network Encryption), unsupported by the thin driver | Set `utplsql.oracleClientMode` to `thick` and `utplsql.oracleClientLibDir` to your Oracle Instant Client, then reload the window |
| Debug doesn't stop at the breakpoint | Package compiled without debug info, or missing debug grants | Compile with `PLSQL_OPTIMIZE_LEVEL <= 1` (or `ALTER PACKAGE ... COMPILE DEBUG PLSQL_OPTIMIZE_LEVEL = 1`) and grant `DEBUG CONNECT SESSION` + `EXECUTE ON SYS.DBMS_DEBUG`. Breakpoints in `test_*.pkb` may not hit (utPLSQL runs tests via dynamic SQL); set them in the code under test. |
| Timeout while running | Tests take longer than `timeoutMinutes` | Increase `utplsql.timeoutMinutes` |
| `%suite` not recognized | Missing `%suite`/`create package` in the file, or `%test` without `PROCEDURE` | Check the spec; run `utPLSQL: Refresh tests` |
| CodeLens doesn't appear | `editor.codeLens` disabled or conflict | Enable `"editor.codeLens": true`; check `utplsql.codeLens.enabled` |
| Shortcuts don't work | Conflict with another extension or VSCode shortcut | Go to File → Preferences → Keyboard Shortcuts and search for `utplsql` to redefine |
| Need diagnostics | Unclear what the extension is doing internally | Set `UTPLSQL_DEBUG=1` before launching VSCode for opt-in diagnostic logs (context of connection/discovery/coverage failures) in the Extension Host console |

## Disclaimer

This is an independent community project. It is not affiliated with, endorsed by, or sponsored by the utPLSQL framework team or Oracle Corporation. utPLSQL and Oracle are trademarks of their respective owners.

## Support

If this extension helps you, you can support its maintenance with a coffee — completely optional. ☕

[☕ Buy me a coffee](https://buymeacoffee.com/gilclebera)

## License

MIT © Gil Cleber Barboza

<!-- prd:PRD-127 --> <!-- prd:PRD-124 -->
