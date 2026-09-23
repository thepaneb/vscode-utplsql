---
id: GLOSS-001
aliases: [GLOSS-001]
tipo: glossario
titulo: "Suite"
dominio: utplsql
status: ativo
verificado: 2026-09-23
implementacao: []
testes: []
regras: ["BR-PARSE-001"]
relacionado: ["[[ENT-002 - Suite]]", "[[01-test-discovery]]"]
tags: ["utplsql"]
---
## Definição

Conjunto de testes utPLSQL de um package, declarado com a annotation `--%suite`.
É o nó intermediário da árvore (Schema > Package > Suite > Test).

## Onde aparece

`suiteParser.ts`, `testTree.ts`, JUnit `testsuite`.

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - Glossario]]
- 📐 Regras: [[BR-PARSE-001 - Arquivo só é suite utPLSQL se tiver %suite E CREATE PACKAGE|BR-PARSE-001]]
- 🔗 [[ENT-002 - Suite]] · [[01-test-discovery]]
<!-- brain:auto:end -->
