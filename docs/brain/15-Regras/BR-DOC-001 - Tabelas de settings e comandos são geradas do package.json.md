---
id: BR-DOC-001
aliases: [BR-DOC-001]
tipo: regra
titulo: Tabelas de settings e comandos são geradas do package.json
dominio: documentacao
status: ativo
severidade: media
interno: true
fonte: codigo
verificado: 2026-10-29
implementacao: ["scripts/brain.cjs", "scripts/docs-fidelity.cjs", "docs/brain/60-README/README (extensão).md", "docs/brain/70-Wiki/Configuration.md", "docs/brain/70-Wiki/Commands.md", "docs/brain/10-Projeto/Referencia - descricoes de settings.md", "docs/brain/10-Projeto/Referencia - descricoes de comandos.md"]
testes: ["src/test/unit/docsTables.test.ts", "src/test/unit/docsFidelity.test.ts", "src/test/unit/brainBuild.test.ts"]
prds: ["PRD-98"]
requisitos: ["PRD-98/RF1", "PRD-98/RF2"]
tags: ["documentacao", "docs"]
---
## Enunciado

As tabelas de settings e comandos do README (EN) e da wiki são **geradas** por
`brain:sync` entre os marcadores `<!-- brain:auto:start:settings -->
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
| `utplsql.oracleClientLibDir` | `""` | Oracle Instant Client directory. Required when `utplsql.oracleClientMode` is `thick` (e.g. `C:\oracle\instantclient_23_5`). |
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
