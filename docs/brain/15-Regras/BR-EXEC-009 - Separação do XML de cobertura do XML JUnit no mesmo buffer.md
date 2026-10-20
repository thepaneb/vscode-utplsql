---
id: BR-EXEC-009
aliases: [BR-EXEC-009]
tipo: regra
titulo: Separação do XML de cobertura do XML JUnit no mesmo buffer
dominio: execucao
status: ativo
severidade: alta
fonte: codigo
erros: [ERR-010]
verificado: 2026-10-20
implementacao: ["src/oracleRunner.ts:962", "src/oracleRunner.ts:970", "src/oracleRunner.ts:971"]
testes: ["src/test/unit/oracleRunner.test.ts", "src/test/unit/coverageHtml.test.ts"]
prds: ["PRD-11", "PRD-12", "PRD-108"]
requisitos: ["PRD-11/RF5", "PRD-108/RF1"]
interno: true
tags: ["execucao"]
---
## Enunciado

Os grupos classificados como XML são concatenados e, se o buffer contém
`<coverage`, o trecho anterior é tratado como JUnit e o trecho a partir desse
índice como XML Cobertura; sem `<coverage`, todo o buffer é JUnit. O grupo HTML
(PRD-108) fica fora dessa concatenação.

## Pré-condições

`xmlBuffer` consolidado a partir dos grupos `output_id` classificados como XML.

## Exceções

Se a cobertura estava habilitada mas `covXml` vem vazio, emite aviso de relatório
não gerado em vez de aplicar cobertura.

## Justificativa

Ambos os reporters XML compartilham a mesma tabela; o marcador `<coverage` é o
delimitador confiável entre os dois XMLs concatenados. A separação por
`output_id` (BR-EXEC-008) garante que o HTML não entre nesse buffer.

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - Regras]]
- 📄 PRDs: [[prd-11-streaming-results|PRD-11]] · [[prd-12-sql-coverage|PRD-12]] · [[prd-108-coverage-html-report|PRD-108]]
- ⚠️ Erros: [[ERR-010 - Erro genérico do ut_runner.run (runner.oracleError)|ERR-010]]
- 🎯 Requisitos: [[prd-11-streaming-results|PRD-11 RF5]] · [[prd-108-coverage-html-report|PRD-108 RF1]]
- 🧩 Código: [[COD - oracleRunner.ts]]
- 🧪 Testes: [[TST - oracleRunner.test.ts]] · [[TST - coverageHtml.test.ts]]
- ↩️ Referenciada por: [[02-test-execution]] · [[04-code-coverage]] · [[ERR-010 - Erro genérico do ut_runner.run (runner.oracleError)|ERR-010]] · [[prd-108-coverage-html-report|PRD-108]] · [[prd-11-streaming-results|PRD-11]] · [[prd-12-sql-coverage|PRD-12]]
<!-- brain:auto:end -->
