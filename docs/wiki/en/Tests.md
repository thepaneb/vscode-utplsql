# Tests

Overview of the extension's tests and how to run them.

## Test types

| Type | Runner | Location | Requires database? |
|---|---|---|---|
| Unit | `node --test` | `src/test/unit/` | No |
| Integration | `@vscode/test-cli` | `src/test/integration/` | Optional (with `.env`) |

## Unit tests

Test pure modules (no `vscode` dependency) — the full list of compiled
files:

```
src/test/unit/  (TypeScript source; runs in out/test/unit/)
├── codelens.test.ts          ├── matching.test.ts
├── compilationDiagnostics.test.ts  ├── oracleRunner.test.ts
├── config.test.ts            ├── quickfix.test.ts
├── coverage.test.ts          ├── rerun.test.ts
├── decorations.test.ts       ├── results.test.ts
├── discovery.test.ts         ├── runner.test.ts
├── junit.test.ts             ├── state.test.ts
├── cobertura.test.ts         ├── statusBar.test.ts
└── suiteParser.test.ts
```

There is also **TypeScript coverage** with `c8`:

```bash
npm run test:coverage   # thresholds: 65% lines/statements, 80% branches, 70% functions
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

```
src/test/integration/
└── extension.test.ts
```

Integration tests have two modes:

- **Without database**: test discovery, commands, UI — do not require Oracle
- **With database** (`describeDB`): test real execution, coverage, reporters —
  require Oracle + environment variables

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
