---
id: GLOSS-003
tipo: glossario
titulo: "Annotation utPLSQL"
dominio: utplsql
status: ativo
verificado: 2026-09-23
implementacao: []
testes: []
regras: []
tags: ["utplsql"]
---
## Definição

Comentário especial `--%suite`, `--%test`, `--%throws`, `--%tags`,
`--%displayname`, `--%disabled` que descreve a suíte/teste no fonte `.pks`.

## Onde aparece

`suiteParser.ts`; cache de anotações reconstruível via `ut_runner.rebuild_annotation_cache`.
