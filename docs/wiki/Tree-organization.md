# Test tree organization

The extension offers two modes for organizing the tree in the Test Explorer:
by **file** (default) or by **Oracle schema**.

## `file` mode (default)

Traditional organization, based on the file path in the workspace:

```
TestController
  └── WorkspaceFolder
      └── tests/
          └── ut_my_tests.pks
              ├── Suite: My Feature Tests
              │   ├── test_case_1
              │   └── test_case_2
              └── Suite: Another Suite
                  └── test_case_3
```

## `schema` mode

Groups tests by Oracle schema, extracted from the file path via regex:

```
TestController
  ├── Schema: APP
  │   └── Package: UT_MY_TESTS
  │       └── Suite: My Feature Tests
  │           ├── test_case_1
  │           └── test_case_2
  └── Schema: LOGIC
      └── Package: UT_BUSINESS_RULES
          └── Suite: Business Rules
              └── test_case_3
```

![Schema-mode tree](images/schema-mode-tree.png)

## Configuration

```jsonc
{
  // Enable schema mode
  "utplsql.organization": "schema",

  // Glob pattern to extract the schema name
  // {schema} is the placeholder — the extension captures whatever is in this position
  "utplsql.organization.schemaPattern": "db/{schema}/**"
}
```

### How the schema is extracted

The `schemaPattern` is applied to the **relative** file path within the
workspace. The `{schema}` placeholder is replaced by a capture group.

| Project structure | schemaPattern | File | Extracted schema |
|---|---|---|---|
| `db/APP/tests/ut_foo.pks` | `db/{schema}/**` | → | `APP` |
| `db/LOGIC/tests/ut_bar.pks` | `db/{schema}/**` | → | `LOGIC` |
| `src/HR/tests/ut_hr.pks` | `src/{schema}/tests/**` | → | `HR` |
| `tests/ut_baz.pks` | `db/{schema}/**` | → | `UNKNOWN` |

### "UNKNOWN" schema

Files that do not match the `schemaPattern` are grouped under the
**"UNKNOWN"** schema, which appears last in the tree. This makes it easy to
quickly identify files outside the expected convention.

### Multi-schema tips

- Use a consistent directory structure: `db/{schema}/tests/packages/`
- `schemaPattern` supports `**` (any depth) and `*` (single level)
- Schema names are converted to **uppercase** (case-insensitive like Oracle)
- Switching between `file` and `schema` automatically rebuilds the tree
- Works with **multi-root**: each workspace folder maintains its own schemas

## Behavior

- **Run all tests in a schema:** click the `Schema: APP` node and run
- **Run a specific package:** click the `Package: UT_MY_TESTS` node
- **Toggle between modes:** change `organization` and the tree is rebuilt on
  the next refresh
- **Pattern without `{schema}`:** all files fall under `UNKNOWN` — there is no
  fallback to `file` mode

## Database discovery (from 0.11.0)

When there is a configured connection (without prompt),
the refresh **supplements** file-based suites with suites discovered directly from
the database via `ALL_OBJECTS`/`ALL_SOURCE` — useful for shared installs and CI
where the `.pks` files are not in the workspace.

- Schemas queried: union of schemas extracted from local suites with the
  directories immediately below the `schemaPattern` base (e.g., `db/*`)
- **Filesystem takes priority** in the merge (match by `packageName`,
  case-insensitive)
- `UT_*` packages (utPLSQL framework) are ignored
- Suites from the database use the virtual URI `utplsql-db:/SCHEMA/PKG.pks` and
  **do not have** CodeLens, inline decorations, or jump to failure — only execution
- Silent fallback: `ALL_SOURCE` inaccessible or Oracle unavailable
  → file-based discovery only
