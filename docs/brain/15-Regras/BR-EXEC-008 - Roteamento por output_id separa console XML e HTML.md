---
id: BR-EXEC-008
aliases: [BR-EXEC-008]
tipo: regra
titulo: Roteamento por output_id separa console, XML e HTML
dominio: execucao
status: ativo
severidade: critica
fonte: codigo
verificado: 2026-10-20
implementacao: ["src/oracleRunner.ts:859", "src/oracleRunner.ts:921", "src/oracleRunner.ts:926", "src/oracleRunner.ts:962", "src/oracleRunner.ts:966"]
testes: ["src/test/unit/oracleRunner.test.ts:1665", "src/test/unit/oracleRunner.test.ts:1706", "src/test/unit/coverageHtml.test.ts"]
prds: ["PRD-11", "PRD-108"]
requisitos: ["PRD-11/RF5", "PRD-108/RF1", "PRD-108/RF2"]
interno: true
tags: ["execucao"]
---
## Enunciado

Cada reporter do utPLSQL grava em um `output_id` próprio. O primeiro texto não
nulo de cada grupo é classificado com `classifyCoverageOutput`: `<!DOCTYPE html>`
/ `<html` → HTML; qualquer outro texto iniciado por `<` → XML; o restante →
console. Linhas de console vão direto para `run.appendOutput()`; as de XML e HTML
são acumuladas por grupo. O XML é concatenado na ordem de primeiro aparecimento e
dividido em `<coverage` (JUnit × Cobertura); o HTML é mantido à parte.

## Pré-condições

Linhas de `UT_OUTPUT_BUFFER_TMP` com `output_id`, `text` e `message_id`.

## Exceções

- Linhas com `text` nulo são ignoradas.
- Conteúdo de CDATA do JUnit não precisa de estado especial: todas as linhas do
  grupo XML vão para o XML, mesmo as que não começam com `<`.
- O HTML nunca é despejado no output do Test Explorer.
- No modo export (PRD-76), o agrupamento é ignorado e todo texto é devolvido.

## Justificativa

O HTML de cobertura e o XML compartilham a mesma tabela; rotear por linha fazia
o HTML contaminar o parse do JUnit/Cobertura. O `output_id` é o limite natural de
cada reporter e também elimina a fragilidade da detecção de CDATA por linha.

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - Regras]]
- 📄 PRDs: [[prd-11-streaming-results|PRD-11]] · [[prd-108-coverage-html-report|PRD-108]]
- 🎯 Requisitos: [[prd-11-streaming-results|PRD-11 RF5]] · [[prd-108-coverage-html-report|PRD-108 RF1]] · [[prd-108-coverage-html-report|PRD-108 RF2]]
- 🧩 Código: [[COD - oracleRunner.ts]]
- 🧪 Testes: [[TST - oracleRunner.test.ts]] · [[TST - coverageHtml.test.ts]]
- ↩️ Referenciada por: [[02-test-execution]] · [[03-results-and-reporting]] · [[prd-108-coverage-html-report|PRD-108]] · [[prd-11-streaming-results|PRD-11]]
<!-- brain:auto:end -->
