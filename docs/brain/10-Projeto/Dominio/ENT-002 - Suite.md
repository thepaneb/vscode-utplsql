---
id: ENT-002
aliases: [ENT-002]
tipo: entidade
titulo: "Suite"
dominio: descoberta
status: ativo
verificado: 2026-09-23
implementacao: []
testes: []
regras: []
relacionado: ["[[GLOSS-001 - Suite]]", "[[01-test-discovery]]"]
tags: ["descoberta"]
---
## Definição

Agrupamento de testes de um package utPLSQL; identificada por `packageName`
(case-insensitive) e podendo ter `dbSchema`.

## Atributos

packageName, description, tags, fileUri/range, testes.

## Onde aparece

`types.ts`, `suiteParser.ts`, `discovery.ts`, `testTree.ts`.

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - Dominio]]
- 🔗 [[GLOSS-001 - Suite]] · [[01-test-discovery]]
<!-- brain:auto:end -->
