---
id: BR-SCHEMA-003
aliases: [BR-SCHEMA-003]
tipo: regra
titulo: collectAllItems usa cachedItems e, se vazio, percorre até 3 níveis
dominio: schema
status: ativo
severidade: media
fonte: codigo
verificado: 2026-09-23
implementacao: ["src/testTree.ts:158", "src/testTree.ts:164", "src/testTree.ts:166"]
testes: ["src/test/unit/testTree.test.ts"]
prds: ["PRD-30"]
requisitos: ["PRD-30/RF4"]
tags: ["schema"]
---
## Enunciado

collectAllItems retorna imediatamente state.cachedItems se já populado; caso contrário percorre os itens da raiz até 3 níveis de profundidade (raiz, filho, neto), suficiente para schema > package > suite, acumulando em cachedItems.

## Pré-condições

Chamado por runForUri/runForFolder.

## Exceções

Itens de teste (4º nível) não são coletados na varredura; o lookup de suites usa o suiteMap.

## Justificativa

Evita varrer a árvore a cada run e cobre a profundidade máxima do modo schema.

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - Regras]]
- 📄 PRDs: [[prd-30-schema-aware-organization|PRD-30]]
- 🎯 Requisitos: [[prd-30-schema-aware-organization|PRD-30 RF4]]
- ↩️ Referenciada por: [[06-tree-organization]]
<!-- brain:auto:end -->
