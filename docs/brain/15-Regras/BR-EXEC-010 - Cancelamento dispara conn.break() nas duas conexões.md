---
id: BR-EXEC-010
aliases: [BR-EXEC-010]
tipo: regra
titulo: Cancelamento dispara conn.break() nas duas conexões
dominio: execucao
status: ativo
severidade: critica
fonte: codigo
verificado: 2026-09-23
implementacao: ["src/oracleRunner.ts:704", "src/oracleRunner.ts:705", "src/oracleRunner.ts:706", "src/oracleRunner.ts:712", "src/oracleRunner.ts:714"]
testes: ["src/test/unit/oracleRunner.test.ts:1504"]
prds: ["PRD-05", "PRD-11"]
requisitos: ["PRD-05/RF3"]
tags: ["execucao"]
---
## Enunciado

Se o token de cancelamento é acionado, então cancelRun() chama conn1.break() e conn2.break() e resolve a promise woken, fazendo o Promise.race sair do loop de poll.

## Pré-condições

executeRunOracle registrou o listener via token.onCancellationRequested.

## Exceções

Erros individuais de break() são engolidos; o listener é descartado no finally.

## Justificativa

conn1 está bloqueada no ut_runner.run e conn2 no poll; interromper ambas é necessário para encerrar limpo sem esperar o run completar.

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - Regras]]
- 📄 PRDs: [[prd-05-progress-cancel|PRD-05]] · [[prd-11-streaming-results|PRD-11]]
- 🎯 Requisitos: [[prd-05-progress-cancel|PRD-05 RF3]]
- ↩️ Referenciada por: [[02-test-execution]]
<!-- brain:auto:end -->
