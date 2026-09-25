---
tipo: wiki
status: ativo
titulo: "Code Coverage"
publicar: docs/wiki/Coverage.md
origem: ["04-code-coverage","MOC - Regras"]
verificado: 2026-09-23
tags: [wiki]
---

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
The `ut_coverage_cobertura_reporter` reporter generates the XML inside the database,
identifying each covered object as `<type> <schema>.<object>`
(e.g. `package body UT3.CALC`). The extension maps those names to local source files
using the `utplsql.sourcePath` setting and the `utplsql.coverageOwner` schema.

## Coverage Scope

By default the whole connection user schema is covered. The scope can be narrowed
with the `utplsql.coverage.*` settings, passed as binds to `ut_runner.run` (the
database builds `ut_coverage_options` internally):

| Setting | Default | Description |
|---|---|---|
| `utplsql.coverage.schemes` | `[]` | Covered schemas (overrides the owner). |
| `utplsql.coverage.includeObjects` | `[]` | Objects to include, as `OWNER.NAME`. Useful for dynamically reached objects. |
| `utplsql.coverage.excludeObjects` | `[]` | Objects to exclude, as `OWNER.NAME`. |
| `utplsql.coverage.includeSchemaExpr` | `""` | Regex of schemas to include. |
| `utplsql.coverage.includeObjectExpr` | `""` | Regex of objects to include. |
| `utplsql.coverage.excludeSchemaExpr` | `""` | Regex of schemas to exclude. |
| `utplsql.coverage.excludeObjectExpr` | `""` | Regex of objects to exclude (e.g. `^UT_` for the utPLSQL framework). |

With all defaults the generated XML is identical to previous versions.

## Declaration Coverage (Function Coverage)

In addition to line-by-line coverage (gutters), the **Test Coverage** tab displays
the percentage of **declarations** (`PROCEDURE`/`FUNCTION`) executed per file.
The extension derives declarations from the source itself and emits `DeclarationCoverage`
to the Test Coverage API:

- **Test Coverage tab** → % of declarations per file/folder
- **Line gutters** → no regression: line-by-line coverage continues
  to be emitted as usual

## Coverage-to-File Mapping

The extension maps the Cobertura `filename` (e.g. `package body UT3.CALC`) to the
local layout (`packages/CALC.sql`, `functions/FN.sql`, `procedures/PR.sql`,
`types/TY.sql`, `triggers/TR.sql`, `views/VW.sql`) and resolves it with
`resolveSourceUri` (absolute → workspace → `sourcePath`), trying the `.sql`, `.pks`,
`.pkb`, `.prc`, `.fnc`, `.trg`, `.tpb` and `.bdy` extensions. It does **not** rely on
`ut_file_mapper.build_file_mappings()` (which expects a list of **files**, not the
`sourcePath` folder).

## Important Notes

- **Packages → `PACKAGE BODY`**: coverage is collected at the **body** of the package,
  not the spec.
- **Dynamic validation**: before running coverage, the extension checks whether
  `UT_COVERAGE_COBERTURA_REPORTER` exists in the database. If not, coverage is
  skipped with a warning — execution is never blocked.

## View Coverage (SQL Objects)

`DBMS_PROFILER`/`DBMS_PLSQL_CODE_COVERAGE` only instruments PL/SQL — views have
no lines to profile and are not part of the Cobertura report. Options:

1. **Tracking via `V$SQL`** (`utplsql.sqlCoverageEnabled: true`): after the run the
   extension queries `V$SQL` and marks each view as **executed** (100%, green) or
   **not executed** (0%, red). The file receives a gutter **per line**
   (all green or all red — boolean coverage, no real per-line hits
   in SQL). Requires `GRANT SELECT ON V$SQL`.
   Best-effort: access failure/timeout does not break execution.
2. **Manual instrumentation**: for line-by-line granularity, convert the
   query into a **package function** that returns the view/cursor — the body enters
   normal PL/SQL coverage.

## Debugging the Coverage Mapping

There is no dedicated Output channel and no per-object log. The extension only
appends a generic message to the run output when **no** file could be mapped:

```
[coverage] no file mapped. Adjust "utplsql.sourcePath" to the source code folder.
```

When mapping succeeds, the result is visible in the editor (green/red gutters)
and in the **Test Coverage** tab.
