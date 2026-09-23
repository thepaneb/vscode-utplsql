---
tipo: moc
status: ativo
modulo: testes
tags: [moc, testes, tdd]
---

# MOC - Testes

## Comandos

```sh
npm run test:unit        # compile + lint → node --test out/test/unit/
npm run test:coverage    # compile → c8 node --test (sem lint)
npm run test:integration # compile → vscode-test
npm test                 # = test:unit
```

Teste individual (compile antes):

```sh
node --test out/test/unit/junit.test.js
node --test --test-name-pattern "duração" out/test/unit/**/*.test.js
```

> `node --test <diretório>` falha — use glob `out/test/unit/**/*.test.js`.
> Para pular lint: `node scripts/run-tests.cjs`.
> Testes com `mock.module` exigem `--experimental-test-module-mocks` (já embutido no `test:unit`/`test:coverage`).

## Stub vscode

- `src/test/vscode-stub.ts`. Duas camadas: por teste (`import './setup.js'`) e runner global
  (`--require scripts/test-setup.cjs`).
- Ao adicionar imports de `vscode` em produção, adicione stub correspondente.

## Integração

- `@vscode/test-cli`, config em `.vscode-test.mjs`.
- Testes com banco (`describeDB`) exigem `.env` com `UTPLSQL_CONN` — sem isso, `describe.skip`.

## Cobertura TS (c8)

- `.c8rc` exclui `out/test/**`. Source maps mapeiam `out/*.js` → `src/*.ts`.
- Thresholds: 90% lines/statements, 85% branches, 90% functions.

## Documentação no repo

- [Tests](../../../docs/wiki/Tests.md)
- [functional/03-results-and-reporting](../../../docs/functional/03-results-and-reporting.md)
- [functional/04-code-coverage](../../../docs/functional/04-code-coverage.md)
