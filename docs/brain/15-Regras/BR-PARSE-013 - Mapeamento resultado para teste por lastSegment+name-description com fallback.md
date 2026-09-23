---
id: BR-PARSE-013
aliases: [BR-PARSE-013]
tipo: regra
titulo: Mapeamento resultado para teste por lastSegment+name/description com fallback
dominio: resultados
status: ativo
severidade: critica
fonte: codigo
verificado: 2026-09-23
implementacao: ["src/matching.ts:12", "src/matching.ts:16", "src/matching.ts:17", "src/matching.ts:18", "src/results.ts:46", "src/results.ts:107", "src/results.ts:109", "src/results.ts:111", "src/results.ts:145", "src/results.ts:154"]
testes: ["src/test/unit/matching.test.ts", "src/test/unit/results.test.ts"]
prds: ["PRD-44"]
requisitos: ["PRD-44/RF1", "PRD-44/RF2"]
tags: ["resultados"]
---
## Enunciado

buildMatchIndex cria chaves package|procName e package|description em minúsculas (description trimada); applyResultsFromCases calcula pkg=lastSegment(classname) (split em ponto e dois-pontos), busca pkg|name e, se falhar, usa findByNameOnly (varredura por procName ou description, case-insensitive/trim); testes sem resultado recebem aviso e run.skipped.

## Pré-condições

leafTests com ItemMeta kind=test; cases do JUnit.

## Exceções

Itens kind=suite são ignorados no índice; só o primeiro match é usado; case sem teste correspondente é descartado; description repetida pode gerar colisão.

## Justificativa

O classname pode vir qualificado (schema.package) e a descrição pode ter espaços; o fallback cobre divergências e o skipped evita resultados silenciosamente perdidos.

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - Regras]]
- 📄 PRDs: [[prd-44-pure-matching|PRD-44]]
- 🎯 Requisitos: [[prd-44-pure-matching|PRD-44 RF1]] · [[prd-44-pure-matching|PRD-44 RF2]]
- ↩️ Referenciada por: [[03-results-and-reporting]]
<!-- brain:auto:end -->
