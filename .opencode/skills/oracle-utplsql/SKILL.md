---
name: oracle-utplsql
description: Oracle utPLSQL testing — test structure, JUnit XML reporter, Cobertura XML coverage, CI/CD integration, and best practices. Use when writing, debugging, or integrating utPLSQL tests in this project.
compatibility: opencode
---

# utPLSQL Testing (v3.x)

Tests run inside Oracle Database. No external runtime needed.

## Test Package Structure

```sql
CREATE OR REPLACE PACKAGE ut_my_tests AS
  -- %suite(My Test Suite)
  -- %suitepath(app.module)

  -- %beforeall
  PROCEDURE setup_suite;

  -- %afterall
  PROCEDURE teardown_suite;

  -- %beforeeach
  PROCEDURE setup_test;

  -- %aftereach
  PROCEDURE teardown_test;

  -- %test(Description of test)
  PROCEDURE test_something;

  -- %test(Raise exception for invalid input)
  -- %throws(-20001)
  PROCEDURE test_invalid_input;

  -- %tags(critical)
  -- %test(High priority test)
  PROCEDURE test_critical_path;

END ut_my_tests;
/
```

## Reporters used by this project

| Reporter | Output | File |
|---|---|---|
| `ut_documentation_reporter()` | Human-readable text | Console output |
| `ut_junit_reporter()` | JUnit XML | Parsed by `src/junit.ts` |
| `ut_coverage_cobertura_reporter()` | Cobertura XML | Parsed by `src/cobertura.ts` |

## Oracle Runner (oracleRunner.ts)

The Oracle direct runner calls `ut_runner.run()` with reporters, polls `UT_OUTPUT_BUFFER_TMP` every 200ms for real-time output, and separates JUnit XML from Cobertura XML for parsing.

## CLI Runner (runner.ts + cli.ts)

The CLI runner uses utPLSQL-cli with `-f=ut_junit_reporter -o=results.xml`. Reports are read from temp files.

## Key project conventions

- Discovery reads `.pks` files (specification only) to find `%suite` and `%test` annotations
- `suiteParser.ts` parses suite text to extract package name, description, and tests
- `applyResults` matches JUnit classname (last segment = package) + test name to TestItems
- Stack frames are parsed from quoted `"SCHEMA.PKG"."PROC", line N` patterns
- `isUserFrame` filters out UT_*, UT$*, UT3_*, UT3$*, UT3.* frames

## Common Mistakes (from oracle/skills)

- Never use `WHEN OTHERS THEN NULL` in test procedures — swallows failures
- Tests should be independently runnable — use `%beforeeach` for fresh state
- Use negative IDs for test data isolation
- Use cursor assertions over COUNT(*) checks
- Check `USER_ERRORS` after deploying test packages

## Best Practices

- Test behavior, not implementation — assert outcomes, not internals
- Keep tests fast (milliseconds per test)
- Co-locate tests: `tests/ut_<pkg>.pks` alongside `src/<pkg>.pks`
- Use `%tags` to separate fast unit tests from slow integration tests
- Run tests on every PR using JUnit XML reporter
