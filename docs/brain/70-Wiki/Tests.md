---
tipo: wiki
status: ativo
titulo: "Tests"
publicar: docs/wiki/Tests.md
origem: ["01-test-discovery","02-test-execution","03-results-and-reporting"]
verificado: 2026-10-31
regras: ["BR-TEST-001", "BR-TEST-002"]
tags: [wiki]
---

# Tests

<!-- prd:PRD-125 -->

Overview of the extension's tests and how to run them.

## Test types

| Type | Runner | Location | Requires database? |
|---|---|---|---|
| Unit | `node --test` | `src/test/unit/` | No |
| Integration | `@vscode/test-cli` | `src/test/integration/` | Optional (with `.env`) |

## Unit tests

Unit tests live in `src/test/unit/` (88 files). They cover pure
modules and modules that depend on `vscode`, using `src/test/vscode-stub.ts`.
The folder is the source of truth for the current list; run
`npm run test:unit` to execute it.

> Tests using `mock.module` (`oracledb-missing-catch.test.ts`,
> `oracledb-default-absent.test.ts`) need `--experimental-test-module-mocks`.
> That flag is already wired into `npm run test:unit` and `npm run test:coverage`.

There is also **TypeScript coverage** with `c8`:

```bash
npm run test:coverage   # thresholds: 97% lines/statements/functions, 93% branches
```

### How to create a test

1. Create `src/test/unit/my_module.test.ts`:

```typescript
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { myFunction } from '../../my_module.js';

describe('myFunction', () => {
  it('returns x for input y', () => {
    assert.strictEqual(myFunction('y'), 'x');
  });

  it('throws an error for invalid input', () => {
    assert.throws(() => myFunction(null));
  });
});
```

2. If the test uses vscode-dependent modules, add the following line at the top:

```typescript
import './setup.js';  // redirects require('vscode') → stub
```

### How to run

```bash
# All
npm test

# Specific file
node --test out/test/unit/junit.test.js

# By name pattern
node --test --test-name-pattern "parse" out/test/unit/**/*.test.js
```

> `node --test <directory>` fails (tries to load the folder as a module).
> Always use the glob `out/test/unit/**/*.test.js`. Compile before running (`npm run compile`).

## Integration tests

Test the extension inside a real VSCode instance:

Integration tests live in `src/test/integration/` (27 files); the folder is
the source of truth for the list, with two modes:

- **Without database**: test discovery, commands, UI — do not require Oracle
- **With database** (`describeDB`): test real execution, coverage, reporters —
  require Oracle + environment variables

Fast subsets / modes:

- `npm run test:integration:smoke` — Oracle capabilities + the DBMS_DEBUG cycle
  (package via direct call and standalone function/namespace `toplevel`) +
  `v017-features` (CodeLens/associations/snippets/HTML coverage), ~1 min.
- `npm run test:integration:thick` — thick mode (Instant Client) in an isolated
  host; needs `ORACLE_CLIENT_LIB_DIR` (Oracle Client 19c+).
- `npm run test:integration:thick-full` — thick suite (experimental; PRD-125).
  Excludes the thin-only tests (`prd70-sqlplus`, `v014-tns`), `thickMode`
  (reinicializa o cliente), os testes de UI/comandos (`extension`,
  `commandsE2E`) e o debugger de function standalone. It needs
  `ORACLE_CLIENT_LIB_DIR` and `UTPLSQL_CONN`.
- `npm run db:matrix` — runs the suite against multiple Oracle versions (see
  [[Contributing]]). The 11g legacy axis is thick-only:
  `npm run db:matrix -- --only 11xe --thick` (requires `ORACLE_CLIENT_LIB_DIR_11XE`
  or the global `ORACLE_CLIENT_LIB_DIR`). The full thick axis is
  `--thick-full` (experimental).

### Setup

Create a `.env` file at the project root:

```bash
UTPLSQL_CONN=UT3/password@//localhost:1521/XEPDB1
```

### Database fixtures

Tests with database use a test schema with example packages:

```
src/test/integration/fixtures/
├── setup.sh                       ← environment setup script
├── setup.sql                      ← schema creation + grants (idempotent)
├── compile_packages.sql           ← test package compilation
├── settings.example.json          ← example workspace settings
├── test_betwnvarchar.pks          ← example suite 1
├── test_calculator.pks/.sql       ← suite + production object
├── test_employees.pks             ← example suite 3
├── test_math.pks                  ← example suite 4
└── test_math_fail.pks             ← suite with intentional failure
```

### How to run

```bash
npm run test:integration
```

### VSCode stub

Modules that depend on `vscode` use `src/test/vscode-stub.ts` — a complete
mock of the VSCode APIs (`TestController`, `TestRun`, `workspace`, etc.).
The stub is loaded in two ways:

1. `import './setup.js'` at the top of the test file (explicit)
2. `--require scripts/test-setup.cjs` in the global runner (safety net)
