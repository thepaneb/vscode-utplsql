---
name: tdd
description: Test-Driven Development workflow for this TypeScript VSCode extension. Red-green-refactor cycle using node --test, compile, lint, test.
compatibility: opencode
---

# TDD Workflow

## Project Test Commands

```sh
npm run compile        # tsc → out/
npm run lint           # biome check src/
npm run test:unit      # compile + lint → node --test out/test/unit/
npm run test:coverage  # compile → c8 node --test (sem lint)
npm test               # = test:unit
```

Individual test:
```sh
node --test out/test/unit/junit.test.js
node --test --test-name-pattern "pattern" out/test/unit/**/*.test.js
```

## Test Infrastructure

- **Pure modules** (testable via `node --test`): suiteParser, junit, cobertura, invocation, matching, cliInfo, cliReporters, codelens (parse), state, types
- **VSCode modules** (need Extension Host): extension, runner, config, cli, discovery, coverage, compilationDiagnostics, quickfix, decorations, statusBar, oracleRunner
- **VSCode stub**: `src/test/vscode-stub.ts` — add stub entries when importing new vscode APIs
- **Integration tests**: `@vscode/test-cli`, requires `.env` with `UTPLSQL_CONN`

## TDD Cycle for This Project

1. **Red**: Write a failing `node --test` in `src/test/unit/`
2. **Green**: Write minimal code in `src/` to make the test pass
3. **Refactor**: Clean up while keeping tests green
4. **Verify**: `npm run compile && npm run lint && node --test out/test/unit/`

## Coverage Thresholds (c8)

- Lines: 65% | Statements: 65% | Branches: 80% | Functions: 70%
- Source maps (`"sourceMap": true`) map `out/*.js` → `src/*.ts`
- `.c8rc` excludes `out/test/**`

## VSCode Extension Testing

- Unit tests on pure modules run with `node --test` directly
- VSCode-dependent tests need Extension Host (F5 launch or `@vscode/test-cli`)
- Integration tests with Oracle require `.env` or are skipped
