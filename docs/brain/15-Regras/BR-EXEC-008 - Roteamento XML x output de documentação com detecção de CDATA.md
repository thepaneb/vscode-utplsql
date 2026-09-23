---
id: BR-EXEC-008
aliases: [BR-EXEC-008]
tipo: regra
titulo: Roteamento XML x output de documentação com detecção de CDATA
dominio: execucao
status: ativo
severidade: critica
fonte: codigo
verificado: 2026-09-23
implementacao: ["src/oracleRunner.ts:744", "src/oracleRunner.ts:746", "src/oracleRunner.ts:747", "src/oracleRunner.ts:749"]
testes: ["src/test/unit/oracleRunner.test.ts:1561"]
prds: ["PRD-11"]
requisitos: ["PRD-11/RF5"]
tags: ["execucao"]
---
## Enunciado

Se uma linha do buffer começa com < ou está dentro de um CDATA aberto, então ela vai para o xmlBuffer; caso contrário vai para appendOutput; o estado inCdata liga em CDATA abre e desliga em CDATA fecha.

## Pré-condições

Linhas de text não nulas vindas do poll.

## Exceções

Conteúdo interno do CDATA (linhas que não começam com <, inclusive o fechamento) é mantido no XML e nunca vaza para o output de documentação.

## Justificativa

O ut_junit_reporter embute o DBMS_OUTPUT capturado em system-out CDATA; linhas de conteúdo e o fechamento não começam com < e quebrariam o parse do JUnit se fossem para o output.

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - Regras]]
- 📄 PRDs: [[prd-11-streaming-results|PRD-11]]
- 🎯 Requisitos: [[prd-11-streaming-results|PRD-11 RF5]]
- ↩️ Referenciada por: [[02-test-execution]]
<!-- brain:auto:end -->
