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
npm run test:unit      # compile + lint → scripts/run-tests.cjs (glob)
npm run test:coverage  # compile → c8 node --test (sem lint)
npm test               # = test:unit
```

Individual test:
```sh
node --test out/test/unit/junit.test.js
node --test --test-name-pattern "pattern" out/test/unit/**/*.test.js
```

## Test Infrastructure

- **Pure modules** (testable via `node --test`): suiteParser, junit, cobertura, matching, plsqlDeclarations, i18n, codelens (parse), state, types
- **VSCode modules** (need Extension Host): extension, runner, config, discovery, coverage, quickfix, decorations, statusBar, oracleRunner, connectionProfiles, scriptRunner, debugger, dbmsDebug, viewCoverage
- **VSCode stub**: `src/test/vscode-stub.ts` — add stub entries when importing new vscode APIs
- **Integration tests**: `@vscode/test-cli`, requires `.env` with `UTPLSQL_CONN`

## Princípios

- **Comportamento, não implementação**: teste pela interface pública; o teste deve
  sobreviver a refatorações.
- **Seams**: teste só em fronteiras públicas pré-acordadas com o usuário.
- **Red antes de green**: escreva o teste que falha primeiro, depois o mínimo para passar.
- **Uma fatia por vez (vertical slice)**: um teste → uma implementação → repete.
- **Refatorar não é parte do loop**: fica para a revisão (`code-review`).

## Anti-padrões

- **Acoplado à implementação**: mocka colaboradores internos ou testa métodos privados
  — quebra ao refatorar sem mudar comportamento.
- **Tautológico**: a asserção recalcula o esperado como o código
  (`expect(add(a, b)).toBe(a + b)`); o valor esperado deve vir de fonte independente.
- **Fatiamento horizontal**: escrever todos os testes antes da implementação testa o
  formato imaginado. Use fatias verticais.

## TDD Cycle for This Project

1. **Red**: Write a failing `node --test` in `src/test/unit/`
2. **Green**: Write minimal code in `src/` to make the test pass
3. **Verify**: `npm run compile && npm run lint && npm run test:unit`
4. **Refactor**: fica para a revisão (`code-review`), não para o loop.

## Coverage Thresholds (c8)

- Lines: 65% | Statements: 65% | Branches: 80% | Functions: 70%
- Source maps (`"sourceMap": true`) map `out/*.js` → `src/*.ts`
- `.c8rc` excludes `out/test/**`

## VSCode Extension Testing

- Unit tests on pure modules run with `node --test` directly
- VSCode-dependent tests need Extension Host (F5 launch or `@vscode/test-cli`)
- Integration tests with Oracle require `.env` or are skipped
