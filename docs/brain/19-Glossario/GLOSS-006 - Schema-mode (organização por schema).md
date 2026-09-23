---
id: GLOSS-006
tipo: glossario
titulo: "Schema-mode (organização por schema)"
dominio: schema
status: ativo
verificado: 2026-09-23
implementacao: []
testes: []
regras: []
tags: ["schema"]
---
## Definição

Modo de organização da árvore em que as suites são agrupadas por schema
(Schema > Package > Suite > Test), controlado por `utplsql.organization`.

## Onde aparece

`testTree.ts` (`buildSchemaTree`/`buildFileTree`), `discovery.ts`, `state.suiteMap`.
