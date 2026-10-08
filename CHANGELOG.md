# Changelog

## 0.15.0

- **Public site and landing page (GitHub Pages) (PRD-96)**: new public,
  indexable landing page at `https://thepaneb.github.io/vscode-utplsql/`, **generated**
  from the vault (`brain:build` → `site/index.html`) and published by
  `.github/workflows/pages.yml` (GitHub Actions). It brings technical SEO (title/meta,
  `canonical`, Open Graph, JSON-LD `SoftwareApplication`, `robots.txt`,
  `sitemap.xml`) and joins the repo's checks: `docs:check` validates the site
  ("Site (GitHub Pages)" section), `brain:gaps` covers `site/**`, and `site/**` is
  kept out of the VSIX. The full documentation within the site is left to PRD-97.

- **Inline expected × actual diff on failures (PRD-52)**: on assertion failures
  (`ut.expect(x).to_equal(y)`), the test panel now shows VS Code's **native diff**
  with the "Expected"/"Actual" values extracted from the reporter message.
  The `parseExpectedActual` parser is pure and tolerant (case-insensitive, multiline,
  `Expected:`/`Actual:` and `... was expected to equal:` formats); failures without the
  markers keep the normal text and *jump to failure* is preserved.

- **Test debugging: at cursor, failed, and last run (PRD-53)**: new
  commands `utplsql.debugAtCursor`, `utplsql.debugFailed`, and `utplsql.debugLast`
  reuse the adapter (`startDebugSession`) to debug the `%test`/`%suite`
  under the cursor, the tests that failed in the last run (QuickPick when there is more
  than one), and the last run in debug mode. Target resolution was extracted into
  pure functions (`src/debugTargets.ts`) and `findAnnotationAtLine` became a shared
  module (`src/annotation.ts`), with a friendly warning when there is no target.

- **Coverage toggle in the status bar (PRD-54)**: a new item on the right of the status
  bar toggles the session's **global coverage mode** (`state.coverageAlways`,
  not persisted) via `utPLSQL: Toggle Coverage`. Entry points without explicit
  coverage (`runAll`, `runFile`, `runAtCursor`, `rerunLast`, `runFailed`) now
  use the flag — centralized in the pure function `effectiveCoverage` in
  `src/coverageDecision.ts` — while the `*Coverage` commands keep forcing
  coverage.

- **Run and selection by Tag (PRD-51)**: `%tags(...)` now reach
  `ItemMeta` (suite and test) — the parser now also captures the **suite header**
  tags — and the new command `utPLSQL: Run Tests by Tag...` opens a multi-select
  QuickPick with the discovered tags (`!tag` excludes, case-insensitive
  comparison). The filter is pure (`src/tagFilter.ts`). The setting
  `utplsql.showTagsInTree` (default `false`) appends `[tag1, tag2]` to the Test Explorer
  label.

- **Tag-based tree organization (PRD-55)**: `utplsql.organization` gains the value
  `tag`, building **Tag > Suite > Test** from the `%tags`. A suite/test with several
  tags appears under each tag (with a per-tag id, without colliding in the VS Code API)
  and those without a tag go into a "(no tag)" group. The canonical ids
  (`suite:<pkg>`/`test:<pkg>.<proc>`) are preserved, keeping `suiteMap`,
  results, and *jump to failure*.

- **Auto-run on save / watch mode (PRD-50)**: the setting `utplsql.autoRun`
  (`off` by default) allows automatically re-running the suites of the saved `.pks`.
  The per-file debounce (`utplsql.autoRunDelayMs`, default 500 ms) coalesces
  fast saves without cancelling distinct files, and the concurrency guard
  (`utplsql.autoRunQueue`: `skip`/`replace`) prevents concurrent runs. The
  logic is pure (`src/autoRun.ts`) and respects the global coverage mode.

- **English-first Marketplace and docs**: everything users see is now in
  English — the extension `description`, the **53 settings descriptions** (plus
  `enumDescriptions` and the untrusted-workspaces note) and the whole
  `CHANGELOG.md` (also reused as the GitHub release notes). `CONTRIBUTING.md`
  and `SECURITY.md` were translated too. The `README` already had an English
  base with **23 language variants**.

- **Support the project — Buy Me a Coffee**: a native **Sponsor** button via
  `.github/FUNDING.yml` (`buy_me_a_coffee`), plus a short, optional "Support"
  section at the end of the `README` in all **24 languages**.

- **Broader integration test suite**: new end-to-end coverage for watch mode
  (auto-run on save), the debug commands (cursor/failed/last), the coverage
  toggle, the tag tree, the wallet/SecretStorage round-trip and run
  cancellation, plus a **multi-root** scenario wired into the full CI scope.

- **Fixed: thick-mode test host (`NJS-118`)**: the extension activates on
  `onStartupFinished` and opened a thin connection from `UTPLSQL_CONN`, so
  `ensureOracleClient` always failed with `NJS-118`. The thick host now runs
  without `UTPLSQL_CONN` and connects via `UTPLSQL_THICK_CONN`; the full thick
  matrix (12.2/18xe/19ee/21xe/23free) passes.

## 0.14.0

- **VS Code 1.101 floor and Node 22 runtime (PRD-94)**: `engines.vscode` goes from
  `^1.88.0` to **`^1.101.0`** — the first VS Code whose Extension Host bundles
  **Node 22** (oldest LTS still supported). **Breaking:** users on VS Code
  **1.88–1.100** (Node 18/20, already EOL) no longer receive the extension. With this,
  `engines.node`/`@types/node` (22) and the `esbuild target` now match the
  runtime, and `docs-fidelity` enforces the consistency.

- **Structured logging in the Output panel (LogOutputChannel)**: the extension's
  diagnostics now go to the **`utPLSQL`** channel, with a level controlled by the
  user in the Output panel (Trace/Debug/Info/Warning/Error) — without depending on
  `UTPLSQL_DEBUG`. The log module stays pure (`src/logger.ts`).

- **Activation in schema/DB-first mode**: `activationEvents` now includes
  `onStartupFinished` and `workspaceContains:**/*.sql`, in addition to `.pks`/`.pkb` — the
  extension activates even when the workspace **has no local `.pks`** (suites coming
  from the database).

- **Security hardening of connection settings (PRD-81)**: the sensitive
  settings (`utplsql.connection`, `utplsql.profiles`, `utplsql.activeProfile`,
  `utplsql.oracleClientLibDir`, `utplsql.oracleClientConfigDir`) become
  **`machine`-scoped** — a third party's `.vscode/settings.json` cannot
  override them. The extension is **disabled in untrusted workspaces**
  (`capabilities.untrustedWorkspaces`). The profile password, stored in
  SecretStorage, is now **tied to the connection**: if the profile's `connection`
  changes, the password is discarded instead of being sent to the new host. Legacy profiles
  are migrated automatically.

- **TNS resolution in thin mode and wallet password in SecretStorage (PRD-82)**: new
  setting `utplsql.connections.tnsAdminPath` (machine-scoped), with fallback to
  the user/machine value of `sqldeveloper.connections.tnsConfiguration.path` and to
  the `TNS_ADMIN` variable. The `tnsnames.ora` parser (`src/tnsnames.ts`) resolves
  aliases on the **thin** driver without depending on env; Easy Connect remains unchanged.
  The profile gained the `walletLocation` field and the command
  `utPLSQL: Set wallet password` stores the wallet password in SecretStorage.

- **Run and export with an arbitrary reporter (PRD-76)**: new command
  `utPLSQL: Run with Reporter (Export)` (Test Explorer context menu) that
  runs the selection with any reporter from the database and writes the output to Output or
  to a file. The settings `utplsql.reporter.clientCharacterSet` and
  `utplsql.reporter.colorConsole` control the arguments
  `a_client_character_set` and `a_color_console` (allowlist per reporter). The export
  does **not** change the results in the Test Explorer.

- **Virtual database source for failures and coverage (PRD-80)**: when there is no
  local file, *jump to failure* and coverage now open a **read-only** document
  resolved from `ALL_SOURCE` (`utplsql-source:/<SCHEMA>/<OBJ>`), for
  any object type (package/body, procedure, function, trigger,
  type/body, view). The legacy scheme `utplsql-db:` remains available.

- **Lazy test tree (PRD-75)**: in `schema` mode, the refresh materializes
  only the **schema** nodes; package/suite/test are resolved on demand when
  expanding (`resolveHandler`), without querying the database for unopened levels.
  "Run All"/"Run Failed" and target collection force the necessary resolution.

## 0.13.0

- **Fix: results and jump-to-failure in suites with `%suitepath` (PRD-87)**: utPLSQL's
  JUnit reporter nests `<testsuite>` according to `--%suitepath`, but the
  parser read only one level; the affected suites were marked as "No JUnit
  result found" in the Test Explorer. The parser now traverses the nested levels,
  recognizes the real stack `SCHEMA.PACKAGE.PROCEDURE`, and resolves the location to the
  `.pks`, without confusing the installation schema `UT3` with internal framework
  objects. Validated by E2E against the real database.

- **Fix: debugger honors `stopOnException` (PRD-86)**: the setting
  `utplsql.debugger.stopOnException` had existed since PRD-33 but had no
  effect — the adapter stored the value without using it and `DBMS_DEBUG`'s `CONTINUE`
  was emitted without the `break_exception` breakflag, so the debuggee never
  suspended on exceptions. Now the client propagates `DBMS_DEBUG.break_exception`
  when the setting is `true` (default), suspending on `reason_exception`
  (`reason='exception'` in DAP); with `false` the old behavior is kept.

- **Canonical second brain (Obsidian) with MCP (PRD-85)**: `docs/brain/` becomes
  **versioned** and the source of truth for human text; `README*`, `docs/wiki/`,
  `docs/functional/`, and `docs/prd/` become **generated** from it
  (`npm run brain:build`). Knowledge is persisted as atomic units — 59
  `BR-*` rules and the `SEC-*`/`ERR-*`/`PAT-*`/`TPL-*`/`GLOSS-*`/`NFR-*`/
  `ENT-*`/`LOC-*`/`PIPE-*` layers — with traceability to code/test/PRD. PRD status
  now lives in the note's **frontmatter** (folder and `index.md` generated).
  The agent reads/writes the vault via Obsidian's **MCP** (Local REST API). CI
  validates drift (`brain:ci` + `git diff --exit-code`).

- **Oracle 12.2 support (utPLSQL 3.1.x)**: utPLSQL **v3.2.x does not compile** on
  12.2 (`PLS-00222` in `UT_ANNOTATION_MANAGER`, which requires an 18c+ feature). The
  database matrix now accepts an **alternative utPLSQL floor per version**
  (4th field in `scripts/db-matrix/matrix.env`); 12.2 uses `v3.1.14`. Documented
  limitation: databases with legacy charset (the 12.2 image is `WE8DEC`) lose
  characters outside the charset (e.g. `€` → `¿`) — the thin driver always uses
  `AL32UTF8` and ignores `NLS_LANG`; the integration charset test now detects
  and skips in that case. (PRD-84)
- **Lean VSIX package**: development files and folders that escaped
  `.vscodeignore` were removed from the package — `.agents/`, `.kilo/`,
  `.github/`, `docker/` (including the database matrix cache, ~5 MB),
  `.c8rc`, `.nvmrc`, `biome.json`, `skills-lock.json`, `SECURITY.md`, and the
  integration test configs (`.vscode-test.smoke.mjs`,
  `.vscode-test.thick.mjs`). (PRD-83)
- **Oracle runner with typed binds, tag filter, and reporter validation
  (PRD-69)**: the paths (`a_paths`) and the coverage schemas
  (`a_coverage_schemes`) are no longer concatenated into PL/SQL and become typed
  binds (`UT_VARCHAR2_LIST`) — no user value is interpolated. The new
  setting `utplsql.tags` exposes `a_tags` of `ut_runner.run` (e.g.
  `fast & !integration`; empty = all). Additional reporters that do not exist are
  ignored with a warning instead of aborting the run.
- **Randomized execution order with seed (PRD-78)**: new settings
  `utplsql.run.randomOrder` (default `false`) and `utplsql.run.randomOrderSeed`
  (default `0`), which pass `a_random_test_order`/`a_random_test_order_seed` to
  `ut_runner.run` to reveal order dependencies between tests. Seed `0` =
  chosen by the database; seed > 0 reproduces the same order and is logged in Output.
- **Advanced coverage scope (PRD-79)**: new settings
  `utplsql.coverage.schemes` (overrides the schemas), `utplsql.coverage.includeObjects`
  and `utplsql.coverage.excludeObjects` (`OWNER.NAME` format) and the regexes
  `includeSchemaExpr`, `includeObjectExpr`, `excludeSchemaExpr`, and
  `excludeObjectExpr`. The values go as binds to `ut_runner.run` (lists
  `UT_VARCHAR2_LIST`, regex `STRING`), which builds the `ut_coverage_options`
  internally. Allows excluding the utPLSQL framework (e.g. `excludeObjectExpr =
  "^UT_"`) and including objects reached only dynamically. Default unchanged.
- **Suite discovery directly from the database (PRD-74)**: in `schema` mode, the tree
  is now built from `ut_runner.get_suites_info` (utPLSQL ≥
  3.1.3) as the canonical source, merged with file-based discovery (file
  wins for URI/line; database for description/tags), with fallback to
  `ALL_SOURCE` when the API is not available. New setting
  `utplsql.discovery.source` (`auto` | `file` | `database`, default `auto`).
- **Rebuild the utPLSQL annotation cache (PRD-77)**: new command
  `utPLSQL: Rebuild Annotation Cache` (`utplsql.rebuildAnnotations`) that calls
  `ut_runner.rebuild_annotation_cache(<owner>)` and refreshes the Test Explorer.
  Useful when the tree comes from `get_suites_info` and the cache is stale
  (missing DDL trigger or manual recompilation). Without a connection, warns; errors
  appear in Output.

## 0.12.1

- **Debugger — real DBMS_DEBUG (PRD-71)**: the client used
  nonexistent signatures (`DEBUG_ON()` as a function, `STEP_INTO/OVER/OUT`, `GET_VALUES`,
  `ATTACH_SESSION(session_id=>,timeout=>)`), so debugging did not work against
  real Oracle. Rewritten to the documented API: `INITIALIZE` + `DEBUG_ON`;
  `ATTACH_SESSION(debug_session_id, diagnostics)`; `SET_BREAKPOINT` with
  `program_info`; stepping via `CONTINUE` with `breakflags`; variables via
  `GET_VALUE` (known names). Breakpoints are now applied after the
  entry (DBMS_DEBUG ignores "deferred"). Validated by an integration test
  that runs breakpoint → stop → frame → variable on all 4 matrix versions.
- **Debugger — gutter breakpoints and Run and Debug**: it was not possible to create
  breakpoints in `.pks/.pkb/.prc/.fnc/.trg` (VS Code disables the gutter in
  files without a *language id*, unless `debug.allowBreakpointsEverywhere` is set), and
  Run and Debug showed no configuration. Added
  `contributes.languages` (`plsql`) + `contributes.breakpoints`, the
  `initialConfigurations` of the `utplsql` debugger (default config when creating a
  `launch.json`), and the command `utPLSQL: Debug Test (PL/SQL)` in the editor
  context menu.
- **Debugger — breakpoint namespace and line**: `SET_BREAKPOINT` always used
  `namespace_pkg_body` and the unit name in lowercase, so
  breakpoints in standalone functions/procedures (`.fnc`/`.prc`/`.sql`) were never
  created (the correct one is `namespace_pkgspec_or_toplevel`, and `program_info` requires the
  dictionary name in uppercase). Now the namespace is chosen by the extension
  (`.pkb`/`.pks` → `pkg_body`, `.fnc`/`.prc` → `toplevel`, `.trg` → `trigger`,
  `.sql` tries all three) and the file line is aligned to the stored object's —
  Oracle strips `CREATE OR REPLACE` and comments before the unit, which
  shifted files with a commented header. The frame line comes back converted
  to the file (correct highlight in the editor).
- **Debugger — test failure and `synchronize` no longer hang the session**: if
  `ut_runner.run` failed (nonexistent test/schema, wrong connection), the error
  was swallowed and `synchronize` got stuck — the Debug Console showed
  only "Session … attached." and nothing else. Now the test failure is reported and
  ends the session, `synchronize` has a 30s timeout, and the number of applied
  breakpoints is logged.
- **Debugger — stops at the entry and waits for the user**: `configurationDone` gave
  automatic `continue`, so the session appeared as "running" (toolbar with
  Pause) and the entry could not be inspected. Now the adapter only sends
  `stopped(reason=entry)` after `configurationDone` (the DAP handshake) and
  stays paused awaiting Continue/Step. The adapter also now responds to
  `threads`/`setExceptionBreakpoints`, without which VS Code does not enable the
  Continue/Step toolbar nor the Call Stack.
- **Debugger — dedicated connections and breakpoints in the code under test**: the
  session used the runner's pool; with the debuggee blocked in `ut_runner.run`, the pool
  was exhausted and **Compile for Debug** failed with `NJS-040 queueTimeout`. Now the
  session uses dedicated connections (outside the pool) and ends with `break()` + timeout.
  Documented that breakpoints in the test package (`test_*.pkb`) may not stop
  (utPLSQL runs tests via dynamic SQL); breakpoints in the **code under
  test** (production function/procedure/package) are hit normally via
  `ut_runner.run`.
- **Debugger — opens the right file when stopping**: `stackTrace` built
  `<unit>.pks`, so when stopping in a function defined in `.sql`, VS Code tried to
  open a nonexistent `.pks`. Now it uses the path of the file where the breakpoint
  was defined.
- **Debugger — "Invalid variable attributes" in the Variables panel**: the `variables`
  response returned `{ name, value, type }` without `variablesReference`
  (mandatory in DAP; `0` = leaf). Now it includes `variablesReference: 0`.
- **i18n — coverage enforcement and tests**: messages that were hardcoded
  (Debug Console/debugger errors, CodeAction title and thick
  mode diagnostic, `Schema`/`Package` Test Explorer labels, progress message)
  now use `t()`; the corresponding keys were added to the 24 catalogs.
  The parity test now also validates **extra keys** and **empty values**
  in the catalogs and the alignment of the `package.nls.*.json`.
- **Tests — coverage and real integration**: new unit tests (`runTest`
  that fails ending the session; `getRuntimeFrame` on error; declarations parser
  with escaped quotes; `viewCoverage` with a broken symlink and nested folder;
  `debugger` with pending breakpoint flush and teardown with a failing `break`;
  `package-target`/`publish` CLI; the no-connection path of `compileForDebug`;
  validation of `matrix.env`/smoke/grants and bash syntax of the matrix scripts) and
  an integration test (`debuggerStandaloneFn`) that exercises `DBMS_DEBUG`
  on a **standalone function** — namespace `toplevel` + dictionary name in
  uppercase —, a scenario the `debuggerE2E` (direct package call) did not
  cover. Included in `npm run test:integration:smoke`.
- **Database matrix — `run.sh` ran only the 1st version**: the loop
  `echo "$VERSIONS" | while read` had its **stdin consumed** by `vscode-test`,
  ending the matrix after the first version. The versions now go into an array
  before the loop, and the full matrix (18xe/19ee/21xe/23free) runs in one pass.
- **Integration — clean build**: `pretest:integration*` now runs `npm run clean`
  before compiling, avoiding running orphan `.test.js` files (removed or
  renamed tests) left in `out/` (`tsc` does not delete orphan outputs).
- **Tests — Node 22/24 compatibility**: the "oracledb missing" mock
  (`oracledb-missing-catch`) used a `Proxy`, whose getter Node 22 did not
  materialize via `namedExports` (the test passed on 24 and failed on 22);
  replaced with an object with a getter. The `launch` cycle of `debugger.test` now
  awaits `initSession` robustly, eliminating the race between versions.
  The suite runs green on Node 22 and 24.
- **Compile for Debug — `PLSQL_OPTIMIZE_LEVEL = 1`**: the command ran only
  `ALTER … COMPILE DEBUG`, which turns on `PLSQL_DEBUG` but keeps the optimization
  level (default 2) — which can remove/reorder lines and the breakpoint is not
  found. Now the command sets `PLSQL_OPTIMIZE_LEVEL = 1` in the same
  `ALTER`, aligned with the documented requirement (`PLSQL_OPTIMIZE_LEVEL <= 1`).
- **Script runner — trailing `;` in SQL statements**: the `;` (client terminator)
  was sent to the server. Oracle 23ai tolerates it via OCI, but 19c/21c reject it
  (`ORA-00933`/`ORA-00922`), so SQL scripts failed on older databases.
  The `;` is now removed from SQL statements; PL/SQL blocks (terminated by `/`)
  keep the `;` of `END;`. Discovered by the new database matrix.
- **Database matrix for integration tests** (local infra): parametric
  compose + bootstrap (utPLSQL, README/debugger grants, schemas, and
  fixtures) to validate the project against 18c/19c/21c/23ai, one version at a time
  (`npm run db:matrix`). Persistent volume per version (re-run in ~1–2 min;
  `--clean` recreates), `--smoke` mode (fast), and `--thick`
  (`npm run test:integration:thick`, with Oracle Instant Client).
- **Schema-mode — run by Schema/Package and Run All**: the `Schema:` and
  `Package:` nodes were not expanded. Running one of them (or Run All in schema mode)
  ran the **entire** database suite without applying results to the Test Explorer.
  Expansion now descends the tree `schema → package → suite → test` before
  building the paths and does not call Oracle when there are no tests.
- **Connection robustness**: schema owner in compilation diagnostics and in
  debug now uses `parseConnString().user` (tolerates a connection without a password,
  e.g. profile `user@host/service`); the runner's 2nd connection returns the 1st to the pool
  on failure (without leaking); cancellation listeners are discarded at the end of the run.
- **Additional reporters**: nonexistent names in
  `utplsql.additionalReporters` are ignored with a warning instead of aborting
  `ut_runner.run` with ORA.
- **Suite discovery**: `.pks/.pkb` files are decoded in the charset of the
  active profile (`latin1`/`win1252`) instead of forcing UTF-8.
- **CI**: now runs `npm run typecheck` and `npm run test:coverage` (enforces
  the c8 coverage thresholds).
- **Optional thick mode (PRD-70)**: new setting `utplsql.oracleClientMode`
  (`thin` default | `thick`) for databases that require **NNE** (Native Network
  Encryption), not supported by the thin driver. With `thick`, a local Oracle Instant
  Client is loaded via `oracledb.initOracleClient` before any
  connection (settings `utplsql.oracleClientLibDir` and
  `utplsql.oracleClientConfigDir` / TNS_ADMIN). Initialization is idempotent and
  occurs in `ensurePool` (`src/oracleClient.ts`); failures become diagnostics in the
  Problems Panel (`UTPLSQL_THICK_MODE`) with a quick-fix for the settings. Default
  unchanged: without the setting, it stays thin.
- **Per-platform publication (PRD-70 Option B)**: `publish.yml` now
  publishes one VSIX per target via a matrix — `win32-x64`/`linux-x64`/`linux-arm64`/
  `darwin-arm64` with only the target's glue (thick+thin) and `win32-arm64`/
  `darwin-x64`/`linux-armhf`/`alpine-x64`/`alpine-arm64` as **thin-only
  fallback** (no native binary, runs databases without NNE). Publication uses
  `vsce publish --packagePath`, ensuring the VSIX attached to the release is the
  same published artifact. The universal VSIX (4 glues, ~2.5 MB) is for local
  testing (`npm run package`).
- **Script runner — SQL*Plus directives**: scripts with `PROMPT`, `SHOW ERRORS`,
  `SET`, `SPOOL`, `@file`/`!command` at the start of a statement no longer fail
  with `ORA-00900`. `splitScript` ignores these lines (preserving numbering)
  when the buffer has only blanks/comments, without affecting legitimate uses like
  `UPDATE … SET …`.
- **Compile for debug (PRD-73)**: new command
  `utPLSQL: Compile for Debug` (`utplsql.compileForDebug`) in the palette and in the
  editor and Explorer context menus (file/folder). It derives the object from the file
  (`.pks`/`.pkb` → package, `.fnc`/`.prc`/`.trg` → function/procedure/trigger;
  `.sql` tries in order) and runs `ALTER … COMPILE DEBUG` reusing the runner's
  pool. Setting `utplsql.debugger.compileOnDebug` (default `false`) compiles the
  package before starting the debug session.
- **Debugger — contribution point**: the `debuggers` block was at the top of
  `package.json` instead of inside `contributes`, so VS Code did not register
  the `utplsql` debug type in the manifest. Moved to `contributes.debuggers`.
- **Documentation**: `docs/wiki` gains dedicated pages for Test Explorer,
  Debugger, Connection Profiles, SQL Scripts, i18n, and Editor Integration;
  `docs/functional` gains the debugger specification (11) and is aligned with the current
  code (thick mode, diagnostics, tree/profiles/scripts).

## 0.12.0

- **PL/SQL coverage**: fixes the missing gutters in `package`/`package body`,
  `function`, `procedure`, `type body`, and `trigger` (only views appeared, via
  `V$SQL`). The run passed the `utplsql.sourcePath` directory as
  `a_file_paths` of `ut_file_mapper.build_file_mappings()`, which expects a list
  of **files** — the Cobertura report came out empty (0 classes). The mapping
  is now done in the client (`mapDbPathsToFiles` + `resolveSourceUri`), with
  extension fallback (`.sql`, `.pks`, `.pkb`, `.prc`, `.fnc`, `.trg`, `.tpb`,
  `.bdy`) when resolving the source file.
- **Reporter validation**: `ut_runner.get_reporters_list()` returns the name
  qualified by the schema (`UT3.UT_COVERAGE_COBERTURA_REPORTER`). The extension
  now strips that prefix before comparing — without it, coverage was
  disabled with the warning "UT_COVERAGE_COBERTURA_REPORTER not available" even
  with the reporter installed, and the additional-reporter QuickPick received
  qualified names and discarded them.

- **Run and coverage fixes**: test `DBMS_OUTPUT` is now enabled and drained in
  the **same session** that runs `ut_runner.run` (before, draining occurred on a
  second connection, with no output); the JUnit XML with fragmented
  `<system-out><![CDATA[...]]>` no longer corrupts the parse — the content
  lines and the closing `]]>`, which do not start with `<`, are now
  routed to the XML while the CDATA is open; an additional reporter with an invalid name
  is ignored (anti-injection guard); the schema owner is resolved via
  `parseConnString` (TNS/SID/IPv6) instead of `split('/')`; "Go to Error" tests
  all workspace roots and prefers an existing file; profile passwords
  are rehydrated from SecretStorage when the window is reloaded
  (`hydrateProfilePasswords`); the cancellation listener and timeout timer are
  released at the end of the run. TypeScript coverage thresholds rise to 90%
  lines/statements, 85% branches, and 90% functions (currently 97/91/97/97), with new
  unit and integration tests of the DB-only paths.

- **Quality, cleanup, and performance (PRD-67)**: `extension.ts` reduced to an
  orchestrator (143 lines) with the commands extracted to `src/commands/`
  (`run`, `debug`, `script`, `profile`, `connection`, `utility`) and the test
  tree in `src/testTree.ts` (testable). New watcher debounce
  (`utplsql.refreshDebounceMs`, default 300 ms) coalesces fast saves;
  debugger and script runner loaded on demand; cross-platform paths with
  drive casing and distinct drives; runtime strings of `junit`/
  `oracleRunner`/`discovery` routed through i18n; removal of dead code from the
  CLI era (`checkCli`, `applyResults`/`applyCoverage`).
- **Diagnostics and session reporter (PRD-68)**: PL/SQL compilation
  diagnostics re-enabled — `ALL_ERRORS` errors appear in the Problems Panel (source
  "utPLSQL Compilation") after a run, controlled by
  `utplsql.compilationDiagnostics.enabled`. The session's volatile additional
  reporter now applies to the next run; `UTPLSQL_BAD_CONN` is emitted on
  connection failure; version threshold centralized (3.1.0) and a guard in
  `extractSchemaFromPath` for patterns without `{schema}`.

- **Connection robustness, logging, and cache (PRD-66)**: connection string accepts
  TNS/SID/IPv6; opt-in diagnostic logs with `UTPLSQL_DEBUG=1`; pool recreated
  when `utplsql.oraclePool*` changes (composite key + `onDidChangeConfiguration`);
  shared connection helper; real verification of `DBMS_DEBUG` grants,
  bind in the debugger, and `v$sql` restricted to the schema.

- **Profile and schema-mode security (PRD-65)**: profile passwords now
  live in the OS vault (VS Code SecretStorage) — `utplsql.profiles` no longer stores
  the password and legacy profiles are migrated on first use. Credentials with
  `/` or `@` in the password are accepted. "Go to Error" opens suites discovered only
  in the database (content provider `utplsql-db`), inline decorations now
  work in `schema` mode, and activation no longer asks for a connection.

- **Running SQL scripts against profiles (PRD-62)**: run SQL/PL/SQL
  scripts (migrations, seeds, setup) against a connection profile via
  `utPLSQL: Run script` (editor), `utPLSQL: Run script file`,
  and `utPLSQL: Run script folder` (Explorer) — connection QuickPick
  after invocation, output per statement in the "utPLSQL Script" OutputChannel.
  Profiles gain `description` (shown in the picker) and `charset`
  (`utf8`/`latin1`/`win1252`, to read files in the correct encoding).
  Settings `utplsql.scriptRunner.*` (`stopOnError`, `autoCommit`,
  `filePattern`, `dbmsOutput`, `timeoutSeconds`).

- **Connection profiles (PRD-34)**: save and switch between multiple Oracle
  connections (`utplsql.profiles` + `utplsql.activeProfile`) with per-profile
  settings (`sourcePath`, `coverageOwner`, `includePatterns`, plus
  `description` and `charset`).
  Commands: Switch/New/Manage Connection Profile and Import from SQL Developer.
  The status bar shows the active profile; without a profile, behavior unchanged.
- **Derived Function Coverage (PRD-48)**: the Test Coverage view now shows
  `% of declarations` per file — `PROCEDURE`/`FUNCTION` declarations are
  derived from the source (hits per scope) and emitted as `DeclarationCoverage`
  alongside the per-line gutters. No regression in the existing percentages.
- **View coverage (PRD-12)**: default `type_mapping` includes `views=VIEW`
  (views appear in the report with 0 hits); new setting
  `utplsql.sqlCoverageEnabled` tracks views executed via `V$SQL`
  (boolean coverage, off by default). Guide in `docs/wiki/Cobertura.md`.
- **PL/SQL Debugger (PRD-33)**: debug utPLSQL tests via `DBMS_DEBUG` —
  breakpoints in `.pks`/`.pkb`, Step Into/Over/Out, Continue/Stop, and inspection
  of local variables (Debug Adapter `type: "utplsql"` + command
  `utplsql.debugTest`). Requires `node-oracledb` + `DBMS_DEBUG`/
  `DEBUG CONNECT SESSION` grants. Settings `utplsql.debugger.*`. Integration with
  a real database pending validation (`describeDB` suite).
- **Internationalization (PRD-49)**: setting `utplsql.language`
  (`auto` | 24 locales — 15 native to VS Code + 9 community) for the
  runtime messages: pt-br, en, en-gb, es, zh-cn, zh-tw, ja, de, fr,
  it, ko, ru, tr, pl, cs, hu, bg, el, id, ro, sr, th, uk, vi; command
  titles via `package.nls` (follow the editor's language). `auto` in a `pt*`
  editor reproduces the current messages.

## 0.11.0

- **Fixes for the first coverage run on Windows (CLI launcher)**:
  - *Arg escaping in cmd.exe*: the Windows branch of `runCli` passed the args
    raw to `cmd.exe /d /c`, and metacharacters (`|`, `(`, `)`, `&` — common in
    `-regex_expression` and in `-type_mapping` with a space) were interpreted by the
    shell (e.g. `'view' is not recognized as a command`), breaking the run with
    coverage in CLI mode. Now, when any arg needs it, the invocation uses an
    intermediate `.cmd` with batch escaping (`%` → `%%`, quotes around
    args outside the safe set) — validated E2E on the real cmd.exe with the coverage
    args.
  - *`callTimeout` leaked on pool connections*: `findInvalidUt3Objects` (5s) and
    `discoverSchemaFromDb` (10s) set `conn.callTimeout` and returned the
    connection to the pool with the timeout still active (node-oracledb does not reset).
    The first run after activating the extension inherited the 5s → `NJS-123: call
    timeout of 5000 ms exceeded` in the middle of the run → fallback to CLI. Both
    restore the previous timeout in the `finally`, and `acquireRunnerConnections`
    zeroes `callTimeout` on checkout.
- **Major dependency update** (PRD-46): `oracledb` 6.10.0 → **7.0.1**
  (+ `@types/oracledb` 7.0.2), `fast-xml-parser` 4.5.7 → **5.11.1**, `iconv-lite`
  → **0.7.3**, and `typescript` → **7.0.2** (native compiler) — no code
  changes beyond `.vscodeignore`. fast-xml-parser v5 brought in transitives
  (`@nodable/entities`, `anynum`, `fast-xml-builder`, `is-unsafe`,
  `path-expression-matcher`, `xml-naming`) that are already bundled in the
  esbuild bundle — pruned from the VSIX. `oracledb/plugins` (IAM/OCI/Azure auth) and
  non-license docs were also pruned (the extension only uses user/pass connection). VSIX: 153 →
  151 files, 952 → 989 KB (+3.9%), thin-only. `engines.node` stays `>= 22`
  (VS Code host floor) and `@types/node` was aligned to the floor (`^22`) — the
  bundle runs on the host's Node 22. Node 26 in the toolchain is left to PRD-47
  (post-LTS, Oct/2026). Validated: 350 unit, coverage 89.65%, 26 integration with a
  real database (pool/streaming/coverage/PRD-43), `vsce ls` without `.node`.
- **Database-based suite discovery in schema mode** (PRD-43): with `organization: schema`
  and `runnerMode` Oracle (`auto`/`oracle`), the refresh now complements file
  discovery by querying `ALL_OBJECTS`/`ALL_SOURCE` (`discoverSchemaFromDb` in
  `discovery.ts`) — useful for shared installs, CI, and environments without the local
  `.pks` code. Candidate schemas come from the union of the local suites' schemas with the
  directories below the base of `organization.schemaPattern` (`discoverSchemasFromFolders`,
  e.g. `db/*`). Filesystem priority in the merge (match by `packageName`, case-insensitive).
  `UT_*` packages (framework) are ignored; `FETCH FIRST 10000 ROWS` + `console.warn`
  of truncation; `callTimeout` of 10s; silent fallback when `ALL_SOURCE` is
  inaccessible or Oracle is unavailable (`import('oracledb')` fails → `[]`). PRD-38 pool
  reused; `resolveConnectionNoPrompt` (refresh does not ask for a connection).
  Suites discovered via DB use the virtual URI `utplsql-db:/SCHEMA/PKG.pks`
  (`SuiteFile.dbSchema`); documented limitation: these suites have no CodeLens,
  Decorations, nor jump to failure (run only). +16 unit tests; +3 integration
  tests with a real database, including an E2E refresh in schema mode.
- **utPLSQL installation check on activation** (PRD-41): `SetupValidator`
  now validates the integrity of the UT3 schema (invalid objects in `ALL_OBJECTS` for
  `PACKAGE`/`TYPE`/`PACKAGE BODY`) on activation and in the `Validate setup` command.
  Best-effort: async, no connection prompt (`resolveConnectionNoPrompt`), 5s timeout
  (`callTimeout`), silent `try/catch`, PRD-38 pool reused
  (`findInvalidUt3Objects` in `oracleRunner.ts`). Diagnostic `UTPLSQL_INVALID_OBJECTS`
  (source "utPLSQL Setup", Warning) with the quick-fix **"Recompile UT3"**
  (`utplsql.recompileUt3` → `DBMS_UTILITY.COMPILE_SCHEMA`), which re-checks and clears the
  diagnostic if resolved. Gates: `setupDiagnosticsEnabled: false` and `runnerMode: cli`
  suppress the check. +14 unit tests; the Code Actions provider is also
  registered for the `utplsql-setup` scheme.
- **Bundling with esbuild + pruning node-oracledb from the VSIX** (PRD-45): `main` now
  points to `dist/extension.js` (single bundle, `fast-xml-parser`/`iconv-lite`
  embedded; `vscode` and `oracledb` external — `await import('oracledb')` preserved).
  New script `npm run bundle` (`esbuild.config.mjs`); `package` and `vscode:prepublish`
  chain `compile && bundle`; `pretest:integration` too. `.vscodeignore` excludes
  `out/**`, the native binaries (`oracledb/build/**`), `examples/`/`package/` of
  oracledb, and the pure deps already embedded. VSIX: 281 → 153 files, ~2.1 MB → 949 KB,
  **vsce performance warning eliminated**. Validated: integration with a real database
  (thin mode **without** native binaries), CLI fallback with oracledb removed, `vsce ls`
  without `.node` and without `out/`.
- **CI/CD workflow improvements** (PRD-21): `ci.yml` and `publish.yml` unified on
  `actions/checkout@v7` + `actions/setup-node@v7`. Redundant compile/lint steps
  removed from CI (`npm test` already triggers `pretest:unit`). Publish uses `npm run package`
  and `npm run publish` instead of `npx @vscode/vsce`; the new `scripts/publish.cjs` keeps the
  local block (publication remains exclusive via release) and bypasses when
  `CI=true` (set by GitHub Actions). `.vscodeignore` now excludes `install/**`
  (local gitignored folder, blocked `vsce package` when it contained `.env`).
- **Result-to-test matching as a pure function** (PRD-44): `buildMatchIndex` and
  `findByNameOnly` extracted to `matching.ts` as pure functions (`MatchEntry[]`
  → `Map`/item), without depending on `TestStateManager`/`WeakMap`. `applyResultsFromCases`
  in `results.ts` builds `entries` before the matching loop (no access to
  `state.getMeta()` inside the loop). No behavior change. +10 unit tests
  in `matching.test.ts`; `matching.ts` coverage at 100%.

## 0.10.0

- **Connection pooling in the Oracle runner** (PRD-38): lazy pool managed by `ensurePool`
  (keyed by the connection string — recreated when the connection changes), closed on
  `deactivate()` with 10s draining. `acquireRunnerConnections` uses `pool.getConnection()`
  with fallback to a raw connection when the pool is not available. `oracledb.outFormat =
  OUT_FORMAT_OBJECT` global, with row accesses by named property (`TABLE_OWNER`,
  `MESSAGE_ID`, `TEXT`). `poolPingInterval` validates idle connections on checkout (internal
  Thin driver ping — no explicit `SELECT 1 FROM DUAL`). New settings:
  `utplsql.oraclePoolMin` (2), `utplsql.oraclePoolMax` (10), `utplsql.oraclePoolIncrement` (1),
  `utplsql.oraclePoolPingInterval` (60). Unit tests of the pool + integration test with a
  real database (pool reuse across runs).
- **Refactor: shared code between runners** (PRD-39): new module `src/results.ts`
  with the canonical functions `applyResultsFromCases`, `applyCoverageFromXml`, `countResults`, and
  `resolveStackFrameToUri` (previously duplicated between `runner.ts` and `oracleRunner.ts`).
  `runner.ts` keeps CLI wrappers (file reading + setup diagnostics); `oracleRunner.ts`
  imports from `results.ts`. `matching.ts` stays pure. Unified behavior: the CLI
  mode gains "Go to Error" (stackFrames → `message.location`) and the Oracle mode gains the warning of
  tests without a match in JUnit. −380/+439 lines, 7 new unit tests, coverage 72.6%.
- **Refactor: Options Object in the Oracle runner** (PRD-40): `executeRunOracle` now receives
  `OracleRunOptions` (typed interface with JSDoc) + `token` — the 11 positional parameters
  become an object with destructuring preserving the local names. The call site in `runner.ts`
  builds the object. No behavior change.
- **SuiteParser: extended annotations** (PRD-42): `parseSuiteText` now extracts
  `%disabled` (suite/test), `%throws(-NNNNN)` (`expectedError`, absolute value),
  `%tags(a,b)` (`tags[]`), `%displayname(name)` (overrides the description in the tree), and the
  lifecycle hooks `%beforeall`/`%beforeeach`/`%aftereach`/`%afterall` (booleans on the suite).
  `discoverWorkspace` skips disabled suites and tests. Annotations case-insensitive;
  a block in the suite header applies to the suite, a block between `%test` and procedure applies to the test.
- **Wiki: manual screenshot checklist + diagrams** (PRD-23, reconciled): capture
  automation discarded (unsatisfactory quality) in favor of a manual checklist of 23 items in
  `docs/wiki/images/README.md` + preserved fixtures. Four new vector diagrams
  (`diagram-arquitetura`, `diagram-conexao`, `diagram-streaming`, `diagram-diagnosticos`)
  referenced in the README and the wiki. Script `npm run gen-diagram` rewritten in
  `scripts/gen-diagrams.cjs` (`@resvg/resvg-js`, cross-platform) — renders all SVGs
  to 1200px PNG without system dependencies.

## 0.9.0

- **Direct Oracle execution with streaming** (PRD-11): new `runnerMode` (`auto`, `cli`, `oracle`). `auto` mode connects via `node-oracledb` (thin driver, optional) and does incremental polling of `UT_OUTPUT_BUFFER_TMP` — each test appears in the Test Explorer in real time. Automatic fallback to CLI if `oracledb` is not available. Support for shared install via `discoverUtplsqlSchema` (schema prefixed in queries). Reporters (doc, JUnit, coverage) write to the same VARCHAR2 table — no dependency on `UT_OUTPUT_CLOB_BUFFER_TMP`.
- **Customizable JVM flags** (PRD-17): new setting `utplsql.javaArgs` (array, default `["-Xmx256m"]`). Flags inserted before `-cp` in `java` mode. Allows `-Xmx`, `-Xms`, `-Dprop=value` without editing code.
- **Compilation diagnostics** (PRD-28): `CompilationDiagnostics` captures `PLS-*`/`ORA-06550` errors from the CLI stdout and displays them as underlines in the editor and `vscode.Diagnostic` in the Problems Panel (source: "utPLSQL Compilation"). Maps to `.pks`/`.pkb` files via `resolveFiles`. Setting `utplsql.compilationDiagnostics.enabled` (default `true`).
- **Jump to failing assertion** (PRD-29): `parseStackFrames` extracts stack traces from the JUnit XML (`at "SCHEMA.PKG"."PROC", line 42`), `resolveStackFrameToUri` maps to the source file. `message.location` populated in the failure/error `TestMessage`s — VS Code enables the native "Go to Error" button. Internal frames (`UT_*`) filtered automatically.
- **Schema-aware test organization** (PRD-30): new setting `utplsql.organization` (`file` | `schema`, default `file`). `schema` mode groups tests in a **Schema > Package > Suite > Test** hierarchy in the Test Explorer. `extractSchemaFromPath` extracts the schema via a configurable glob regex in `utplsql.organization.schemaPattern` (placeholder `{schema}`, default `db/{schema}/**`). Support for `UNKNOWN` for files outside the pattern.
- **Quick-fix setup diagnostics** (PRD-32): `SetupValidator` validates the CLI, Java, connection, and utPLSQL version on extension activation. `UtplsqlCodeActionProvider` offers Code Actions (quick-fix) in the Problems Panel: "Configure utplsql.cliPath", "Reconfigure connection", "Copy grants". New commands: `utplsql.validateSetup`, `utplsql.configureConnection`, `utplsql.copyGrantsToClipboard`. Setting `utplsql.setupDiagnostics.enabled` (default `true`).
- **TypeScript coverage with c8** (PRD-37): `test:coverage` script with `c8`, `.c8rc` with thresholds 65/80/70 (lines/branches/functions), reporters `text` + `lcov` + `html`. Exclusion of `src/test/**` and `out/test/**`. Current coverage: **69.4% lines** (241 tests).
- **Expanded coverage tests**: `decorations.test.ts` +5 tests, `statusBar.test.ts` +5 tests, `discovery.test.ts` +3 tests, `compilationDiagnostics.test.ts` +1 test. Mock infra expanded in `vscode-stub.ts` (`StatusBarItem`, `__setMockFileError`, `__setVisibleEditors`, `Uri.joinPath`).
- **Complete documentation**: new wiki pages (Direct Oracle execution, Diagnostics and quick-fix, Tree organization). FAQ +9 questions, Troubleshooting +4 entries, README with a dual CLI/Oracle diagram, reorganized sidebar.

## 0.8.0

- CodeLens Integration (PRD-24): Run/Run with Coverage buttons over `%suite` and `%test` in the editor.
- Status Bar Indicator (PRD-25): indicator with pass/fail count, duration, tooltip, and progress bar.
- Inline Test Result Decorations (PRD-26): ✓/✗/⚠ icons in the editor after a run, overview ruler, tooltip with the failure.
- Default Keybindings (PRD-27): 9 `Ctrl+Shift+U` + key shortcuts for frequent commands.
- Smart Re-run Patterns (PRD-31): Rerun Last (`Ctrl+Shift+U L`), Run at Cursor (`Ctrl+Shift+U U`), Run Failed Only (`Ctrl+Shift+U X`).

## 0.7.2

- Fix: reporter parsing with the utPLSQL 3.2.x format — names with a `:` suffix and
  indented descriptions were not recognized, silently disabling coverage (PRD-36).
- `coverageEnabled` flag prevents a false "GRANT EXECUTE" diagnostic when the coverage
  reporter is not available.
- Fix: coverage report not generated on Windows in `launcher` mode (PRD-35):
  bypass of the double quoting wrap between `quoteArg` and Node.js in `cmd.exe`.
- Test hardening for `quoteArg` with Windows paths, regex patterns, and strings with `=`.
- Improved diagnostic in `applyCoverage` when the coverage file does not exist.
- CLI argument log (without connection) to ease debugging.

## 0.7.1

- `engines.node` alignment with CI (PRD-18): requirement relaxed from `^24.0.0` to `>=20.0.0`.
- PRD system normalization (PRD-19): standardized H1s (`# PRD-NN —`), Completed table
  ordered numerically, titles aligned with the source files.
- Dependency and configuration cleanup (PRD-20): `c8` removed (unused), Biome exclusion
  patterns fixed (`/**` for directories), `mocha` types isolated in the integration
  scope.
- Wiki workflow syncs images (PRD-22): `docs/wiki/images/` directory copied
  automatically to the wiki repository.

## 0.7.0

- Dynamic reporters (PRD-10):
  - New pure module `cliReporters.ts` with `parseReportersOutput` and `listReporters`.
  - Dynamic validation before coverage: if `UT_COVERAGE_COBERTURA_REPORTER`
    does not exist in the database, coverage is skipped with a warning (never blocks a run).
  - New setting `utplsql.additionalReporters` for fixed extra reporters.
  - New command `utplsql.selectReporter` with a QuickPick of the reporters available
    in the database; the selected one is used in the next run and discarded afterward.
- README updated: Reporters section, missing commands and settings documented.

## 0.6.0

- Test infrastructure with a real Oracle (PRD-13, PRD-14, PRD-15):
  - Oracle 23ai Free container with utPLSQL v3.2.3 installed in the UT3 schema.
  - `utplsql_test` schema with 3 test packages (test_betwnvarchar, test_math, test_employees).
  - `src/test/integration/fixtures/setup.sh` script to set up the whole environment.
  - Integration tests expanded in `extension.test.ts` with conditional dependency
    on the real database via `UTPLSQL_CONN`.
- Integration tests for both invocation modes (PRD-16): coverage of `launcher`
  and `java` in the tests with a real database, validation of the command-line arguments.

## 0.5.3

- Discovery fix: `RelativePattern` removed, `findFiles` now uses a simple glob
  `**/*.pks` compatible with Windows.

## 0.5.2

- Discovery fix: the `**/*.pks` glob pattern now searches recursively in subfolders.
- runForFolder/runForUri wait for refresh to complete before filtering.

## 0.5.1

- Folder filter fix for Windows (trailing separator + race condition on refresh).

## 0.5.0

- Notifiable progress + cancellation (PRD-05): progress bar with count,
  `utplsql.cancelRun` to abort a run.
- Multi-root workspace support (PRD-06): suite discovery scoped per folder,
  coverage resolves files in the correct folder, `ItemMeta` with a `folder` field.
- Advanced CLI settings (PRD-08): `timeoutMinutes`, `dbmsOutput`, `quiet`,
  `failureExitCode`.
- `utplsql info` diagnostic (PRD-09): shows CLI/API/DB versions with `semverLt`.
- URI→suites filtering extracted to `matching.ts` with 12 unit tests.
- `src/` coverage at 76% (+110 tests, 0 failures).
- Tests work in the VS Code Test Explorer (setup independent of `--require`).

## 0.4.0

- Refactor of `extension.ts` (PRD-02): pure modules (`suiteParser`, `junit`, `cobertura`) without a `vscode` dependency.
- CI pipeline + Linter with Biome (PRD-03): `ci.yml` workflow, `lint`/`format` scripts, auto-formatting of all of `src/`.
- Test coverage expansion (PRD-04): 5 new unit test files, `applyResults` with `appendOutput` fallback, mock infra for `vscode`.
- Node 24 + TypeScript 6.0 upgrade (PRD-07): `.nvmrc`, `@types/node ^24`, `typescript ^6.0.3`, `engines.node ^24`.

## 0.3.0

- New **`java`** invocation mode (PRD-01): calls the JVM directly
  (`java -cp <home>/etc;<home>/lib/* org.utplsql.cli.Cli`) **without a shell**, instead of the
  `utplsql.bat` launcher. Avoids Windows `cmd` and metacharacter handling
  (`^`, `|`) — regex arguments in `coverageSourceArgs` pass through literally.
- New settings: `utplsql.javaPath` (Java executable) and `utplsql.cliHome`
  (utPLSQL-cli root; empty = derived from `cliPath`). `launcher` mode remains the default.

## 0.2.5

- Refinement of the instructions.

## 0.2.4

- Added instructions for coverage to work with `utPLSQL-cli`.
- Added the GRANTS needed for `utPLSQL` to work in DBA mode.

## 0.2.3

- Added the logo.

## 0.2.2

- Coverage mapped to source files (gutters / Sonar): the extension passes `-owner`
  (derived from the connection, or `utplsql.coverageOwner`) + configurable regex/type_mapping
  (`utplsql.coverageSourceArgs`) for the `sourcePath/<type>/<name>.sql` structure.
- Removed `-test_path` from coverage (with the typed structure it zeroed the report).

## 0.2.1

- Published on the Marketplace.

## 0.2.0

- Parsing logic isolated in pure modules (`suiteParser`, `junit`, `cobertura`) without a `vscode` dependency.
- Unit tests with `node --test` (parsers) and integration tests with `@vscode/test-cli`.

## 0.1.0

- Suite/test discovery via `%suite` / `%test` annotations.
- Integration with the Test Explorer (Test Results view).
- Context menu in the Explorer (folder and `.pks`/`.pkb` files) and in the editor.
- Execution via `utPLSQL-cli` with JUnit report parsing.
- Visual coverage (gutters + percentage per file) via the Test Coverage API,
  fed by the utPLSQL Cobertura reporter.
