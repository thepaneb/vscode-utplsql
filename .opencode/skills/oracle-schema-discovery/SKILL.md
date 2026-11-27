---
name: oracle-schema-discovery
description: Oracle schema introspection — ALL_OBJECTS, ALL_SYNONYMS, ALL_TABLES, invalid object detection. Use when working with discovery.ts, oracleRunner.ts discoverUtplsqlSchema, or schema-mode organization.
compatibility: opencode
---

# Oracle Schema Discovery

## Project patterns

### discoverUtplsqlSchema (`oracleRunner.ts`)

Resolves the utPLSQL owner in Oracle name-resolution order: package `UT_RUNNER`
in the current schema → private synonym → public synonym → accessible
`UT_RUNNER` package (`ALL_OBJECTS`, preferring `UT3`). Returns `'UT3.'`/`'OWNER.'`
(or empty string on failure). The prefix is used by `ut_runner.run`,
`UT_VARCHAR2_LIST`, `UT_REPORTERS`, reporters, buffer queries and the debugger.
See `docs/brain/50-Snippets/Descobrir prefixo do schema utPLSQL.md` for the SQL.

### Schema-mode (discovery.ts:85-104)

`extractSchemaFromPath` uses `path.posix.relative` + pattern matching with `{schema}` placeholder to extract schema name from file paths. E.g., `db/{schema}/**` → matches `db/HR/package.pks` → schema = `HR`.

### File-based discovery (discovery.ts:50-83)

`discoverWorkspace` reads `.pks` files and parses test suites via `suiteParser.ts`. Does NOT query the database.

## Key queries (from oracle/skills)

### Finding invalid objects
```sql
SELECT object_name, object_type, last_ddl_time
FROM all_objects
WHERE owner = :schema AND status = 'INVALID'
ORDER BY object_type, object_name;
```

### Schema summary
```sql
SELECT object_type, COUNT(*) AS cnt,
       SUM(CASE WHEN status = 'VALID' THEN 1 ELSE 0 END) AS valid,
       SUM(CASE WHEN status = 'INVALID' THEN 1 ELSE 0 END) AS invalid
FROM all_objects
WHERE owner = :schema
  AND object_type NOT IN ('INDEX','INDEX PARTITION','TABLE PARTITION')
GROUP BY object_type;
```

### Packages and procedures
```sql
SELECT object_name, object_type, status, last_ddl_time
FROM all_objects
WHERE owner = :schema
  AND object_type IN ('PROCEDURE','FUNCTION','PACKAGE','PACKAGE BODY')
ORDER BY object_type, object_name;
```

## Best Practices

- Use `ALL_*` views (not `DBA_*`) to respect user's access level
- Cache metadata within a session
- Use `DBMS_ASSERT` for dynamic SQL with identifiers
- Check `ALL_DEPENDENCIES` before proposing changes

## See Also

- oracle-db: Full Oracle domain router
- oracle-nodejs: node-oracledb driver
- oracle-utplsql: Testing with utPLSQL
