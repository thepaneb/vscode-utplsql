---
id: GLOSS-006
aliases: [GLOSS-006]
tipo: glossario
titulo: "Schema-mode (organização por schema)"
dominio: schema
status: ativo
verificado: 2026-09-23
implementacao: []
testes: []
regras: ["BR-SCHEMA-001"]
relacionado: ["[[06-tree-organization]]"]
tags: ["schema"]
---
## Definição

Modo de organização da árvore em que as suites são agrupadas por schema
(Schema > Package > Suite > Test), controlado por `utplsql.organization`.

## Onde aparece

`testTree.ts` (`buildSchemaTree`/`buildFileTree`), `discovery.ts`, `state.suiteMap`.

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - Glossario]]
- 📐 Regras: [[BR-SCHEMA-001 - organization bifurca file tree vs schema tree; suiteMap é o lookup canônico|BR-SCHEMA-001]]
- 🔗 [[06-tree-organization]]
<!-- brain:auto:end -->
