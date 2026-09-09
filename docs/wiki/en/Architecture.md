# Architecture

Overview of the extension's internal architecture for contributors.

## Execution flow

![Execution architecture](../images/diagram-arquitetura.png)

`src/extension.ts` is the orchestrator. `src/runner.ts` contains `executeRun`.
`src/oracleRunner.ts` contains `executeRunOracle`. The shared canonical
functions live in `src/results.ts` (`applyResultsFromCases`,
`applyCoverageFromXml`, `countResults`, `resolveStackFrameToUri`).

- `oracleRunner.ts`: conn1 executes `ut_runner.run(...)` (blocking); conn2 polls
  `UT_OUTPUT_BUFFER_TMP` every 200ms (real-time documentation +
  JUnit/Cobertura XML at the end).
- **Connection pooling (v0.10.0)**: managed pool (`ensurePool`), recreated if
  the connection changes, closed in `deactivate()` with a 10s drain.
- `discoverUtplsqlSchema`: `UT3.` prefix via `ALL_SYNONYMS` (shared install).

### Build (v0.11.0)

`main` points to `dist/extension.js` — a single bundle via **esbuild**
(`npm run bundle`), with `vscode` and `oracledb` **external**; native oracledb
binaries are stripped from the VSIX (`.vscodeignore`), leaving only the thin
driver (IAM/OCI auth `plugins/` are also stripped — the extension only uses
user/pass connection). Pure deps (fast-xml-parser v5 + transitive, iconv-lite)
are bundled.

## Critical separation: pure modules vs vscode-dependent

| Pure (testable with `node --test`) | Depends on `vscode` |
|---|---|
| `suiteParser.ts` — `%suite`/`%test` regex + annotations | `extension.ts` |
| `junit.ts` — JUnit XML parsing + stack frames | `runner.ts`, `results.ts` |
| `cobertura.ts` — Cobertura XML parsing | `config.ts` |
| `matching.ts` — URI/folder filter + result→test matching | `discovery.ts` |
| `codelens.ts` (parse) — `parseCodeLensItems` | |
| `state.ts`, `types.ts` (type-only) | |
| `plsqlDeclarations.ts` — extracts PROCEDURE/FUNCTION declarations from source | |
| `i18n.ts`, `i18nLocales.ts` — localization (24 locales) | |
| | `connectionProfiles.ts` — connection profiles |
| | `viewCoverage.ts` — DeclarationCoverage in the Test Coverage tab |
| | `dbmsDebug.ts`, `debugger.ts` — PL/SQL debugging via DBMS_DEBUG |

Modules in the left column **do not import `vscode`** (at runtime) and are
testable with `node --test` without any setup.

![Internationalization (i18n) diagram](../images/diagram-i18n.png)

![PL/SQL debugger (DBMS_DEBUG) diagram](../images/diagram-debugger.png)

## Context keys

| Key | When |
|---|---|
| `utplsql:activated` | Extension activated |
| `utplsql:running` | Execution in progress |
| `utplsql:connected` | Connection resolved/cleared |
| `utplsql:hasFailures` | Last run had failures |

## Settings data flow

| Setting (package.json) | config.ts (`readConfig`) | Usage |
|---|---|---|
| `utplsql.sourcePath` | `cfg.sourcePath` | `-source_path` / `resolveSourceUri` |
| `utplsql.includePatterns` | `cfg.includePatterns` | `discovery.ts` (findFiles) |
| `utplsql.timeoutMinutes` | `cfg.timeoutMinutes` | `-t=N` (only if !=60) |
| `utplsql.dbmsOutput` | `cfg.dbmsOutput` | `-D` (only if true) |
| `utplsql.quiet` | `cfg.quiet` | `-q` (only if true) |
| `utplsql.failureExitCode` | `cfg.failureExitCode` | `--failure-exit-code` (only if !=1) |
| `utplsql.additionalReporters` | `cfg.additionalReporters` | `-f=` flags (deduplicated) |
| `utplsql.oraclePoolMin/Max/Increment/PingInterval` | `cfg.oraclePool*` | `oracleRunner.ts` (`ensurePool`) |
| `utplsql.codeLens/statusBar/decorations.enabled` | `cfg.*Enabled` | UX providers |
| `utplsql.compilationDiagnostics.enabled` | `cfg.compilationDiagnosticsEnabled` | `runner.ts` |
| `utplsql.setupDiagnostics.enabled` | `cfg.setupDiagnosticsEnabled` | `quickfix.ts` |
| `utplsql.organization`/`organization.schemaPattern` | `cfg.organization`/`organizationSchemaPattern` | `extension.ts` (tree + DB discovery) |
| `utplsql.connection` | `resolveConnection()` | Oracle connection param |
| `UTPLSQL_CONN` (env) | `resolveConnection()` (2nd source) | Oracle connection param |

## Test infrastructure

### vscode stub

Modules that import `vscode` (right column) use a two-layer stub system:

1. **Per test** — `src/test/unit/setup.ts` redirects `require('vscode')`
   to `src/test/vscode-stub.ts`
2. **Global runner** — `scripts/run-tests.cjs` with `--require scripts/test-setup.cjs`
   as a safety net

### Integration tests

`npm run test:integration` launches a VSCode instance via `@vscode/test-cli`.
Requires a real Oracle database + `UTPLSQL_CONN` defined in `.env`.

## Result → test mapping

`applyResultsFromCases` in `results.ts` (canonical function, v0.11.0) uses
heuristics: match by `package` (last segment of JUnit `classname`) +
test name/description, with name-based fallback. The match index is built
in `matching.ts` (pure functions `buildMatchIndex`/`findByNameOnly`), scoped
by package to minimize ambiguity. `applyResults` in `runner.ts` is just a
wrapper (errors when JUnit doesn't exist).

## Coverage file resolution

`resolveSourceUri` in `coverage.ts` tries:
1. Absolute path (already resolved)
2. Relative to workspace folder
3. Relative to `sourcePath`
