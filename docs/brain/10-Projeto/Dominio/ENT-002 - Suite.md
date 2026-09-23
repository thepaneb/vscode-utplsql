---
id: ENT-002
tipo: entidade
titulo: "Suite"
dominio: descoberta
status: ativo
verificado: 2026-09-23
implementacao: []
testes: []
regras: []
tags: ["descoberta"]
---
## Definição

Agrupamento de testes de um package utPLSQL; identificada por `packageName`
(case-insensitive) e podendo ter `dbSchema`.

## Atributos

packageName, description, tags, fileUri/range, testes.

## Onde aparece

`types.ts`, `suiteParser.ts`, `discovery.ts`, `testTree.ts`.
