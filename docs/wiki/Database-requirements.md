<!-- GENERATED FROM docs/brain/70-Wiki/Database-requirements.md — DO NOT EDIT -->

# Database requirements

<!-- prd:PRD-123 --> <!-- prd:PRD-124 -->

Grants and configurations required on the Oracle database to use the extension
with all features.

## Oracle / utPLSQL compatibility

| Oracle | utPLSQL | Character set | Notes |
|---|---|---|---|
| 18c+ | v3.2.x / v3.1.x | `AL32UTF8` | Recommended. |
| 12.2 | **v3.1.x only** | prefer `AL32UTF8` | v3.2.x fails to compile (`PLS-00222`). Legacy `WE8DEC` loses non-representable chars. |
| 11.2 (11g R2) | **v3.1.x only** | prefer `AL32UTF8` | **Thick mode required** (thin starts at 12.1; Instant Client **19c+**); coverage via `DBMS_PROFILER`. |

> The thin driver uses **always `AL32UTF8`** and ignores `NLS_LANG`; the server
> converts to the database character set. On a `WE8DEC` database, `€` becomes
> `¿` and the extension cannot fix it client-side.

## Coverage

Enables the profiler for the schema that runs the tests:

```sql
-- 12.2+ (also 19c/23ai)
GRANT EXECUTE ON SYS.DBMS_PROFILER TO <schema_that_runs_the_tests>;
GRANT EXECUTE ON SYS.DBMS_PLSQL_CODE_COVERAGE TO <schema_that_runs_the_tests>;
-- 11.2 (11g): only DBMS_PROFILER (DBMS_PLSQL_CODE_COVERAGE is 12.2+)
```

Without these grants, tests will run but coverage will come back **empty** (0%).

> On Oracle **11.2 (11g)** grant only `DBMS_PROFILER`;
> `DBMS_PLSQL_CODE_COVERAGE` was introduced in **12.2**. The
> `Copy coverage grants to clipboard` command copies both statements — ignore
> the second one on 11g.

> Thick mode requires Oracle Instant Client **19c+** (node-oracledb 26); the
> driver loads **`libclntsh.so`/`libclntsh.dylib` by the standard name**, so a
> versioned file (`libclntsh.so.19.1`) is not loaded directly. The 11g axis uses
> Instant Client 23.0 in the matrix.

## Test discovery in OTHER schemas

When utPLSQL is installed in **shared** mode (owner `UT3` with tests in
separate application schemas), the utPLSQL owner needs to **read the
dictionary** of the application schemas:

```sql
GRANT SELECT ON SYS.DBA_SOURCE     TO <ut3_owner>;
GRANT SELECT ON SYS.DBA_OBJECTS    TO <ut3_owner>;
GRANT SELECT ON SYS.DBA_PROCEDURES TO <ut3_owner>;
```

**Important:**
- **`SELECT ANY DICTIONARY` alone is NOT enough** — direct grants on
  these views are required (due to `dbms_assert.sql_object_name` in
  definer context).
- The utPLSQL **DDL trigger** must also be installed (keeps the annotation
  cache up to date after code changes).

Verification (as the owner):
```sql
SELECT ut_metadata.get_source_view_name FROM dual;
-- should return: dba_source
```

## Schema architecture

![Schema architecture — owner UT3 + app schemas](images/diagram-schemas.png)

### Shared install (recommended)

Owner `UT3` receives `SELECT ON DBA_SOURCE/OBJECTS/PROCEDURES` grants to read
annotations in application schemas (`DEV`, `TEST`, ...).

### Per-schema install

utPLSQL installed **in the same schema** as the tests — no cross-schema grants.

> In **per-schema** installs, `DBA_SOURCE`/`DBA_OBJECTS`/
> `DBA_PROCEDURES` grants are **not** required — the framework reads its
> own source.

## Shared install — runner, coverage and synonyms

The schema that runs the tests needs direct grants on the runner buffer and on
the profiler tables used by the Cobertura reporter. Grants do **not** create
synonyms: the test packages call `ut.expect` unqualified and the
`UT_COVERAGE_*` packages use `AUTHID CURRENT_USER` to read `DBMSPCC_*` from the
current schema.

```sql
-- As DBA (or the UT3 owner):
GRANT SELECT, INSERT, UPDATE, DELETE ON UT3.UT_OUTPUT_BUFFER_TMP      TO <schema>;
GRANT SELECT, INSERT, UPDATE, DELETE ON UT3.UT_OUTPUT_BUFFER_INFO_TMP TO <schema>;

GRANT SELECT ON UT3.DBMSPCC_BLOCKS TO <schema>;
GRANT SELECT ON UT3.DBMSPCC_RUNS   TO <schema>;
GRANT SELECT ON UT3.DBMSPCC_UNITS  TO <schema>;

GRANT EXECUTE ON UT3.UT               TO <schema>;
GRANT EXECUTE ON UT3.UT_RUNNER        TO <schema>;
GRANT EXECUTE ON UT3.UT_VARCHAR2_LIST TO <schema>;
GRANT EXECUTE ON UT3.UT_REPORTERS     TO <schema>;

-- Run in the test schema (or prefix with <schema>. as DBA):
CREATE OR REPLACE SYNONYM UT               FOR UT3.UT;
CREATE OR REPLACE SYNONYM UT_RUNNER        FOR UT3.UT_RUNNER;
CREATE OR REPLACE SYNONYM UT_VARCHAR2_LIST FOR UT3.UT_VARCHAR2_LIST;
CREATE OR REPLACE SYNONYM UT_REPORTERS     FOR UT3.UT_REPORTERS;
CREATE OR REPLACE SYNONYM DBMSPCC_BLOCKS   FOR UT3.DBMSPCC_BLOCKS;
CREATE OR REPLACE SYNONYM DBMSPCC_RUNS     FOR UT3.DBMSPCC_RUNS;
CREATE OR REPLACE SYNONYM DBMSPCC_UNITS    FOR UT3.DBMSPCC_UNITS;
```

> The extension qualifies `ut_runner`, `ut_varchar2_list`, `ut_reporters` and the
> reporter constructors with the discovered owner. The `UT` and `DBMSPCC_*`
> synonyms remain required for the test code and the current-user coverage
> helper. Without the `DBMSPCC_*` synonyms, coverage fails with
> `ORA-00942: table or view "<schema>.DBMSPCC_BLOCKS" does not exist`.

## PL/SQL debugging (`DBMS_DEBUG`)

To debug tests (Debug Adapter `utplsql`), the schema that runs the tests needs:

```sql
GRANT DEBUG CONNECT SESSION      TO <schema_that_runs_the_tests>;
GRANT EXECUTE ON SYS.DBMS_DEBUG  TO <schema_that_runs_the_tests>;
```

The target package must also be compiled with **debug information**: Oracle
strips it at `PLSQL_OPTIMIZE_LEVEL = 2` (the default). Compile with
`PLSQL_OPTIMIZE_LEVEL <= 1` (or `ALTER PACKAGE <pkg> COMPILE DEBUG
PLSQL_OPTIMIZE_LEVEL = 1`, or use the **`utPLSQL: Compile for Debug`**
command), otherwise breakpoints are silently ignored.

> `ALTER ... COMPILE DEBUG` alone only sets `PLSQL_DEBUG` and keeps the
> optimizer level — it must be combined with `PLSQL_OPTIMIZE_LEVEL = 1`.

## Full verification

Run this script as DBA to audit the configuration:

```sql
-- 1. Check if utPLSQL is installed (shared owner)
SELECT ut_runner.version() FROM dual;

-- 2. Check profiler grants (coverage)
SELECT grantee, table_name, privilege
FROM dba_tab_privs
WHERE table_name IN ('DBMS_PROFILER', 'DBMS_PLSQL_CODE_COVERAGE')
  AND grantee IN ('UT3', 'DEV', 'TEST');

-- 3. Check dictionary grants (cross-schema discovery)
SELECT grantee, table_name, privilege
FROM dba_tab_privs
WHERE table_name IN ('DBA_SOURCE', 'DBA_OBJECTS', 'DBA_PROCEDURES')
  AND grantee = 'UT3';

-- 4. Check utPLSQL source view
SELECT ut_metadata.get_source_view_name FROM dual;
-- Expected: dba_source (shared) or all_source (per-schema)

-- 5. Check runner buffer grants
SELECT grantee, table_name, privilege
FROM dba_tab_privs
WHERE table_name IN ('UT_OUTPUT_BUFFER_TMP', 'UT_OUTPUT_BUFFER_INFO_TMP')
  AND grantee IN ('UT3', 'DEV', 'TEST', 'PUBLIC');

-- 6. Check the synonyms used by test code and coverage
SELECT owner, synonym_name, table_owner, table_name
FROM dba_synonyms
WHERE synonym_name IN ('UT', 'UT_RUNNER', 'UT_VARCHAR2_LIST', 'UT_REPORTERS',
                       'DBMSPCC_BLOCKS', 'DBMSPCC_RUNS', 'DBMSPCC_UNITS')
  AND owner IN ('DEV', 'TEST', 'PUBLIC');
```
