---
id: BR-TEST-005
aliases: [BR-TEST-005]
tipo: regra
titulo: Harness de perf usa fixture por seed e fica fora do caminho crítico
dominio: qualidade
status: ativo
severidade: media
interno: true
fonte: codigo
verificado: 2026-11-05
implementacao: ["src/test/perf/perfFixture.ts", "src/test/perf/support/timing.ts", "scripts/perf-run.sh", ".github/workflows/performance.yml"]
testes: ["src/test/unit/perfFixture.test.ts", "src/test/perf/perfHarness.test.ts"]
prds: ["PRD-106"]
requisitos: ["PRD-106/RNF1", "PRD-106/RNF2"]
tags: [teste, performance]
---

## Enunciado

A fixture de performance é gerada no banco por seed (packages `UT_PERF_####`),
com modos `tree`/`mixed`/`full`, e grava uma linha JSON por fase em
`test-results/perf-report.jsonl`. O harness roda **fora** do `npm test` e do
caminho crítico do PR, por workflow semanal/dispatch ou sob demanda.

## Pré-condições

`UTPLSQL_CONN` aponta para o banco; `UTPLSQL_PERF_PACKAGES`/`UTPLSQL_PERF_TESTS`
definem a escala. Sem banco, o teste faz skip.

## Exceções

A fixture completa (~1000 packages/15k testes) não roda no CI de PR; o eixo
`18c`/`21c` pode reutilizar o mesmo script na matriz.

## Justificativa

Detecta regressões estruturais de descoberta/árvore/parse em escala sem tornar
o feedback do PR lento ou frágil por tempo de parede.
