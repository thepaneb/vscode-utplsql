---
id: BR-COB-007
aliases: [BR-COB-007]
tipo: regra
titulo: Cobertura resolve root e sourcePath pelo folder do pacote em execucao
dominio: cobertura
status: ativo
severidade: media
fonte: codigo
verificado: 2026-10-14
implementacao: ["src/matching.ts", "src/runner.ts", "src/viewCoverage.ts", "src/results.ts"]
testes: ["src/test/unit/matching.test.ts", "src/test/integration/multiRootE2E.test.ts"]
prds: ["PRD-57"]
requisitos: ["PRD-57/RF1", "PRD-57/RF2", "PRD-57/RF3", "PRD-57/RNF1", "PRD-57/RNF2"]
tags: ["cobertura", "multi-root"]
---

# BR-COB-007 — Cobertura resolve root e sourcePath pelo folder do pacote em execução

## Enunciado

A execução **não** assume o primeiro workspace folder. As raízes usadas pela
cobertura saem dos itens realmente em execução (`resolveRunRoots`, a partir do
`folder` do `TestItem`), e cada consumidor resolve por folder:

- `applySqlCoverage` descobre as views em **cada** raiz do run (união sem
  repetição) e mantém apenas as views sob a pasta analisada;
- a cobertura Cobertura (`applyCoverageFromXml` → `resolveSourceUri`) tenta cada
  workspace folder como base, com o `sourcePath` relativo ao folder do pacote.

Sem informação de folder (item sem meta, árvore por arquivo, folder desconhecido)
a execução cai em **todos** os folders. Single-root tem comportamento idêntico ao
anterior (a lista de raízes tem um elemento).

## Pré-condições

Pelo menos um workspace folder e itens com `meta.folder` populado (o discovery já
atribui o folder de cada suite — PRD-06).

## Exceções

`discoverDbSuites`/`discoverSchemaFromDb` (modo schema, descoberta **no banco**)
ainda atribuem as suites ao primeiro folder: é o escopo da PRD-06, declarado como
não-objetivo da PRD-57.

## Justificativa

Com `folders[0]` fixo, num workspace multi-folder a cobertura do segundo folder
era resolvida contra a raiz errada — e a cobertura de `views` do segundo folder
nem era descoberta. Como o mapeamento Cobertura já tentava cada folder, a falha
real estava no `root` da cobertura por `V$SQL`.

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - Regras]]
- 📄 PRDs: [[prd-57-multiroot-root-resolution|PRD-57]]
- 🎯 Requisitos: [[prd-57-multiroot-root-resolution|PRD-57 RF1]] · [[prd-57-multiroot-root-resolution|PRD-57 RF2]] · [[prd-57-multiroot-root-resolution|PRD-57 RF3]] · [[prd-57-multiroot-root-resolution|PRD-57 RNF1]] · [[prd-57-multiroot-root-resolution|PRD-57 RNF2]]
- 🧩 Código: [[COD - matching.ts]] · [[COD - runner.ts]] · [[COD - viewCoverage.ts]] · [[COD - results.ts]]
- 🧪 Testes: [[TST - matching.test.ts]] · [[TST - multiRootE2E.test.ts]]
- ↩️ Referenciada por: [[Coverage]] · [[prd-57-multiroot-root-resolution|PRD-57]]
<!-- brain:auto:end -->
