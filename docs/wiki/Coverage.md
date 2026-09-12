# Code Coverage

The extension feeds the VSCode **Test Coverage API**, showing coverage
directly in the editor and in the Coverage tab.

- **Executed** lines → green gutter 🟢
- **Not executed** lines → red gutter 🔴
- **Test Coverage** tab → percentage per file/folder

![Green and red coverage gutters in the editor](images/editor-coverage-gutters.png)

![Test Coverage panel with per-file percentages](images/coverage-panel.png)

## How It Works

Execution is performed directly on Oracle via `node-oracledb` — no external CLI.
The `ut_coverage_cobertura_reporter` reporter generates the XML inside the database.
The mapping of covered objects to source files is resolved by the
`ut_file_mapper.build_file_mappings()` function in Oracle itself, which returns the
path of each covered object. The extension reads the Coverage XML and uses these
mappings (with fallback to `resolveSourceUri`) to associate each object
to a source file in the workspace.

## Declaration Coverage (Function Coverage)

In addition to line-by-line coverage (gutters), the **Test Coverage** tab displays
the percentage of **declarations** (`PROCEDURE`/`FUNCTION`) executed per file.
The extension derives declarations from the source itself and emits `DeclarationCoverage`
to the Test Coverage API:

- **Test Coverage tab** → % of declarations per file/folder
- **Line gutters** → no regression: line-by-line coverage continues
  to be emitted as usual

## Coverage-to-File Mapping

Coverage-to-source-file mapping is handled internally by Oracle
via `ut_file_mapper.build_file_mappings()`. The function returns the absolute
path of each covered object, which the extension maps to the local workspace
using `resolveSourceUri` (absolute → workspace → sourcePath).

## Important Notes

- **Packages → `PACKAGE BODY`**: coverage is collected at the **body** of the package,
  not the spec.
- **Dynamic validation**: before running coverage, the extension checks whether
  `UT_COVERAGE_COBERTURA_REPORTER` exists in the database. If not, coverage is
  skipped with a warning — execution is never blocked.

## View Coverage (SQL Objects)

`DBMS_PROFILER`/`DBMS_PLSQL_CODE_COVERAGE` only instruments PL/SQL — views have
no lines to profile. Options:

1. **`type_mapping` with `views=VIEW`** (default): views in the covered schema
   appear in the report with **0 hits** (file listed, not executed).
   Expected structure: `sourcePath/views/<name>.sql`.
2. **Tracking via `V$SQL`** (`utplsql.sqlCoverageEnabled: true`): after the run the
   extension queries `V$SQL` and marks each view as **executed** (100%, green) or
   **not executed** (0%, red). The file receives a gutter **per line**
   (all green or all red — boolean coverage, no real per-line hits
   in SQL). Requires `GRANT SELECT ON V$SQL`.
   Best-effort: access failure/timeout does not break execution.
3. **Manual instrumentation**: for line-by-line granularity, convert the
   query into a **package function** that returns the view/cursor — the body enters
   normal PL/SQL coverage.

## Debugging the Coverage Mapping

Check the **Log Output** in the VSCode output panel. The object-to-file
mapping (`ut_file_mapper` + `resolveSourceUri`) is logged there, including
which objects were mapped and which failed:

```
--   CALCULADORA → PACKAGE BODY → install/packages/calculadora.sql
--   DOBRO → FUNCTION → install/functions/dobro.sql
--   LOG_AUDITORIA → (not mapped — no file matched)
```

![Coverage mapping log in the terminal](images/output-coverage-mapping.png)
