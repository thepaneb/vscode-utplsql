---
id: BR-PARSE-017
aliases: [BR-PARSE-017]
tipo: regra
titulo: Filtro por tag - inclusão e exclusão (!) case-insensitive; sem tag só sem inclusão
dominio: resultados
status: proposta
severidade: media
fonte: codigo
verificado: 2026-10-02
implementacao: []
testes: []
prds: ["PRD-51"]
requisitos: ["PRD-51/RF3", "PRD-51/RNF1", "PRD-51/RNF2"]
tags: ["tags", "resultados"]
---

# BR-PARSE-017 — Filtro por tag - inclusão e exclusão (!) case-insensitive; sem tag só sem inclusão

## Enunciado

`filterItemsByTags(items, include, exclude)` compara em case-insensitive; uma tag
prefixada com `!` compõe a exclusão; um item sem tags só é incluído quando
`include` está vazio, preservando o comportamento atual.

## Pré-condições

Itens com `ItemMeta.tags` (teste/suíte) propagados; `include`/`exclude` não nulos.

## Exceções

Item que casa inclusão E exclusão é excluído; `exclude` sozinho mantém os demais
incluídos.

## Justificativa

A UI de execução por tag (PRD-51) precisa de semântica determinística e
compatível com o "rodar tudo" atual.

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - Regras]]
- 📄 PRDs: [[prd-51-run-by-tag|PRD-51]]
- 🎯 Requisitos: [[prd-51-run-by-tag|PRD-51 RF3]] · [[prd-51-run-by-tag|PRD-51 RNF1]] · [[prd-51-run-by-tag|PRD-51 RNF2]]
- ↩️ Referenciada por: [[prd-51-run-by-tag|PRD-51]]
<!-- brain:auto:end -->
