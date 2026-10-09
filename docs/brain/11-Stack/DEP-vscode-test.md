---
id: DEP-vscode-test
aliases: [DEP-vscode-test]
tipo: dependencia
status: ativo
titulo: "@vscode/test-cli + test-electron"
nome: "@vscode/test-cli"
versao: "^0.0.15 / ^3.1.0"
escopo: dev
licenca: MIT
criticidade: media
risco: "Exige Extension Host (display/xvfb) e um Oracle acessível; config por .mjs"
alternativas: []
tags: [dependencia, dev, testes]
---

# DEP-vscode-test — @vscode/test-cli + test-electron

## Papel no projeto

Testes de **integração** (`npm run test:integration`): sobem o Extension Host
(`@vscode/test-electron`) e rodam os cenários E2E contra um Oracle. Config em
`.vscode-test.mjs` (e variantes smoke/thick/multiroot). Casos com banco usam
`describeDB` e exigem `.env` com `UTPLSQL_CONN` (senão `describe.skip`).

## Riscos

- Precisa de display (`xvfb-run` no CI) e de um banco; sem isso, pulam.
- Versões `0.0.x`/major do test-cli mudam com frequência.

## Alternativas

- Nenhuma (é o harness oficial do VSCode).

## Referências

- `package.json` · `.vscode-test.mjs` · `src/test/integration/`
