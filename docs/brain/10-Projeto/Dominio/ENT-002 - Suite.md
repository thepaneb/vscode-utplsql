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
regras: ["BR-PARSE-001", "BR-SCHEMA-001"]
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
- 📐 Regras: [[BR-PARSE-001 - Arquivo só é suite utPLSQL se tiver %suite E CREATE PACKAGE|BR-PARSE-001]] · [[BR-SCHEMA-001 - organization bifurca file tree vs schema tree; suiteMap é o lookup canônico|BR-SCHEMA-001]]
- 🔗 [[GLOSS-001 - Suite]] · [[01-test-discovery]]
- ↩️ Referenciada por: [[GLOSS-001 - Suite|GLOSS-001]]
<!-- brain:auto:end -->
