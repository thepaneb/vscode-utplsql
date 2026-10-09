---
id: DEP-c8
aliases: [DEP-c8]
tipo: dependencia
status: ativo
titulo: "c8"
nome: c8
versao: "^12.0.0"
escopo: dev
licenca: ISC
criticidade: media
risco: "Thresholds (97/93/97/97) quebram o CI se a cobertura cair"
alternativas: [nyc]
tags: [dependencia, dev, cobertura]
---

# DEP-c8 — c8

## Papel no projeto

Cobertura dos testes unitários (`npm run test:coverage`), instrumentando
`node --test` diretamente (não via `run-tests.cjs`). Exclui `out/test/**` e
`src/test/**`; source maps mapeiam `out/*.js` → `src/*.ts`.

## Riscos

- **Thresholds globais**: lines/statements **97**, branches **93**, functions
  **97** — código novo sem teste derruba o CI.

## Alternativas

- nyc — não adotado.

## Referências

- `package.json` · `.c8rc`
