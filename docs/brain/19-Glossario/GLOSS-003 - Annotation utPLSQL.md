---
id: GLOSS-003
aliases: [GLOSS-003]
tipo: glossario
titulo: "Annotation utPLSQL"
dominio: utplsql
status: ativo
verificado: 2026-09-23
implementacao: []
testes: []
regras: ["BR-PARSE-004"]
relacionado: ["[[01-test-discovery]]"]
tags: ["utplsql"]
---
## Definição

Comentário especial `--%suite`, `--%test`, `--%throws`, `--%tags`,
`--%displayname`, `--%disabled` que descreve a suíte/teste no fonte `.pks`.

## Onde aparece

`suiteParser.ts`; cache de anotações reconstruível via `ut_runner.rebuild_annotation_cache`.

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - Glossario]]
- 📐 Regras: [[BR-PARSE-004 - Annotations estendidas só valem após o primeiro %test|BR-PARSE-004]]
- 🔗 [[01-test-discovery]]
<!-- brain:auto:end -->
