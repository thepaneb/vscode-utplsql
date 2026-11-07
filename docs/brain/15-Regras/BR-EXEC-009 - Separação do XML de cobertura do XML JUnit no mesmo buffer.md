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
verificado: 2026-11-07
implementacao: ["src/oracleRunner.ts:1214", "src/oracleRunner.ts:1223", "src/oracleRunner.ts:1226"]
testes: ["src/test/unit/oracleRunner.test.ts", "src/test/unit/coverageHtml.test.ts"]
prds: ["PRD-11", "PRD-12", "PRD-108"]
requisitos: ["PRD-11/RF5", "PRD-108/RF1"]
interno: true
tags: ["execucao"]
---
## Enunciado

Cada grupo `output_id` classificado como XML é parseado separadamente pela tag
raiz: `<coverage` é Cobertura; `<?xml`, `<testsuites>` e `<testsuite>` são JUnit.
Um grupo legado que misture os dois documentos ainda usa `<coverage` como
fronteira de fallback. O grupo HTML (PRD-108) fica fora do parse XML.

## Pré-condições

Grupos `output_id` classificados como XML; o classificador ignora chunks
iniciais só com brancos até o primeiro texto real.

## Exceções

Se a cobertura estava habilitada mas nenhum grupo Cobertura foi produzido, emite
aviso de relatório não gerado em vez de aplicar cobertura.

## Justificativa

Cada reporter escreve em um `output_id` próprio; separar por grupo evita depender
da ordem JUnit→Cobertura e do `indexOf('<coverage')`. A separação por `output_id`
(BR-EXEC-008) garante que o HTML não entre no parse XML.

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
