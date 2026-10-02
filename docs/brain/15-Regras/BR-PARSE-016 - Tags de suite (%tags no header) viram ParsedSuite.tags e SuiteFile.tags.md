---
id: BR-PARSE-016
aliases: [BR-PARSE-016]
tipo: regra
titulo: Tags de suíte (%tags no header) viram ParsedSuite.tags e SuiteFile.tags
dominio: parser
status: proposta
severidade: media
fonte: codigo
verificado: 2026-10-02
implementacao: []
testes: []
prds: ["PRD-51"]
requisitos: ["PRD-51/RF2"]
tags: ["parser", "tags"]
---

# BR-PARSE-016 — Tags de suíte (%tags no header) viram ParsedSuite.tags e SuiteFile.tags

## Enunciado

Um `%tags(...)` entre `%suite` e o primeiro `%test` é atribuído à suíte
(`ParsedSuite.tags`/`SuiteFile.tags`), normalizado como o de teste (split por
vírgula, trim, remove vazios); `%tags` após o primeiro `%test` continua indo para
`tests[].tags`.

## Pré-condições

Arquivo reconhecido como suite (BR-PARSE-001); annotation antes do primeiro `%test`.

## Exceções

Lista vazia após o filtro não cria o campo; `%tags` antes e depois do primeiro
`%test` são conjuntos independentes (suíte × teste).

## Justificativa

O agrupamento/filtro por tag (PRD-51/PRD-55) exige tags de suíte no `SuiteFile`,
não só por teste (PRD-42 só capturava por teste).

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - Regras]]
- 📄 PRDs: [[prd-51-run-by-tag|PRD-51]]
- 🎯 Requisitos: [[prd-51-run-by-tag|PRD-51 RF2]]
- ↩️ Referenciada por: [[prd-51-run-by-tag|PRD-51]]
<!-- brain:auto:end -->
