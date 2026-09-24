---
id: BR-EXEC-009
aliases: [BR-EXEC-009]
tipo: regra
titulo: Separação do XML de cobertura do XML JUnit no mesmo buffer
dominio: execucao
status: ativo
severidade: alta
fonte: codigo
verificado: 2026-09-23
implementacao: ["src/oracleRunner.ts:785", "src/oracleRunner.ts:786", "src/oracleRunner.ts:787", "src/oracleRunner.ts:810"]
testes: ["src/test/unit/oracleRunner.test.ts:1632", "src/test/unit/oracleRunner.test.ts:1603"]
prds: ["PRD-11", "PRD-12"]
requisitos: ["PRD-11/RF5"]
tags: ["execucao"]
---
## Enunciado

Se o buffer acumulado contém <coverage, então o trecho anterior é tratado como JUnit e o trecho a partir desse índice como XML Cobertura; sem <coverage, todo o buffer é JUnit.

## Pré-condições

xmlBuffer já consolidado ao fim do loop.

## Exceções

Se a cobertura estava habilitada mas covXml vem vazio, emite aviso de relatório não gerado em vez de aplicar cobertura.

## Justificativa

Ambos os reporters compartilham a mesma tabela; o marcador <coverage é o delimitador confiável entre os dois XMLs concatenados.

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - Regras]]
- 📄 PRDs: [[prd-11-streaming-results|PRD-11]] · [[prd-12-sql-coverage|PRD-12]]
- 🎯 Requisitos: [[prd-11-streaming-results|PRD-11 RF5]]
- 🧩 Código: [[COD - oracleRunner.ts]]
- 🧪 Testes: [[TST - oracleRunner.test.ts]]
- ↩️ Referenciada por: [[02-test-execution]] · [[04-code-coverage]] · [[ERR-010 - Erro genérico do ut_runner.run (runner.oracleError)|ERR-010]]
<!-- brain:auto:end -->
