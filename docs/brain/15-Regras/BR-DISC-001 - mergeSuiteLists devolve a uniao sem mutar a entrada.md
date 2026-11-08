---
id: BR-DISC-001
aliases: [BR-DISC-001]
tipo: regra
titulo: mergeSuiteLists devolve a união sem mutar a entrada
dominio: descoberta
status: ativo
severidade: alta
fonte: codigo
verificado: 2026-11-08
implementacao: ["src/discovery.ts"]
testes: ["src/test/unit/discovery.test.ts", "src/test/unit/testTree.test.ts"]
prds: ["PRD-148"]
requisitos: ["PRD-148/RF5"]
interno: true
tags: ["descoberta", "merge"]
---
## Enunciado

`mergeSuiteLists(fileSuites, dbSuites)` devolve uma nova lista com a união por
`LOWER(packageName)`: suites/testes só-arquivo e só-banco são preservados;
arquivo prevalece em `uri`/`line`/`folder`; banco prevalece em
descrição/tags. A entrada não é mutada.

## Pré-condições

Listas de suites descobertas por arquivo e por banco (uma pode ser vazia).

## Exceções

Quando há mais de uma suite de arquivo com o mesmo package, cada suite do banco
consome a primeira ainda não usada; as demais entram como só-banco.

## Justificativa

A implementação anterior substituía `file.tests` pelos testes do banco, perdia
testes só-arquivo e mutava o input — a árvore podia perder suítes recém-salvas.

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - Regras]]
- 📄 PRDs: [[prd-148-execution-state-reliability|PRD-148]]
- 🎯 Requisitos: [[prd-148-execution-state-reliability|PRD-148 RF5]]
- 🧩 Código: [[COD - discovery.ts]]
- 🧪 Testes: [[TST - discovery.test.ts]] · [[TST - testTree.test.ts]]
- ↩️ Referenciada por: [[Architecture]] · [[prd-148-execution-state-reliability|PRD-148]]
<!-- brain:auto:end -->
