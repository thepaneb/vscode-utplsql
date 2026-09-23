---
id: BR-PARSE-009
tipo: regra
titulo: Linhas de get_suites_info - 1-based para 0-based e filtros
dominio: descoberta
status: ativo
severidade: media
fonte: codigo
verificado: 2026-09-23
implementacao: ["src/discovery.ts:235", "src/discovery.ts:296", "src/discovery.ts:313", "src/discovery.ts:316", "src/discovery.ts:320", "src/discovery.ts:325", "src/discovery.ts:332"]
testes: ["src/test/unit/discovery.test.ts"]
prds: ["PRD-74"]
requisitos: ["PRD-74/RF1", "PRD-74/RF2"]
tags: ["descoberta"]
---
## Enunciado

mapSuitesInfoToSuiteFiles agrupa por owner/package (case-insensitive), converte item_line_no de 1-based para 0-based com Math.max(0, line-1), ignora itens context, filtra testes disabled e omite o package inteiro se a suíte estiver disabled ou sem testes; só UT_SUITE/UT_TEST/UT_SUITE_CONTEXT são tipos válidos.

## Pré-condições

Linhas normalizadas por getSuitesInfo (itemType mapeado, owner em maiúsculas).

## Exceções

Tipos desconhecidos são descartados; URI virtual gerada como utplsql-db:/OWNER/PKG.pks; dbSchema recebe o owner.

## Justificativa

Alinha as posições do editor (0-based) às linhas do dicionário Oracle (1-based) e replica o filtro de disabled da descoberta por arquivo.

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - Regras]]
- 📄 PRDs: [[prd-74-db-first-discovery|PRD-74]]
- 🎯 Requisitos: [[prd-74-db-first-discovery|PRD-74 RF1]] · [[prd-74-db-first-discovery|PRD-74 RF2]]
<!-- brain:auto:end -->
