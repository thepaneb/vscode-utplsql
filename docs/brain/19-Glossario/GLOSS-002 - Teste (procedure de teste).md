---
id: GLOSS-002
aliases: [GLOSS-002]
tipo: glossario
titulo: "Teste (procedure de teste)"
dominio: utplsql
status: ativo
verificado: 2026-09-23
implementacao: []
testes: []
regras: ["BR-PARSE-003"]
relacionado: ["[[ENT-003 - TestCase]]", "[[01-test-discovery]]"]
tags: ["utplsql"]
---
## Definição

Procedure anotada com `--%test` (descrição + `procedure <nome>`). É a folha da
árvore e a unidade de resultado/cobertura.

## Onde aparece

`suiteParser.ts`, JUnit `testcase`, `matching.ts`.

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - Glossario]]
- 📐 Regras: [[BR-PARSE-003 - %test só materializa teste quando seguido de PROCEDURE; órfão é sobrescrito|BR-PARSE-003]]
- 🔗 [[ENT-003 - TestCase]] · [[01-test-discovery]]
<!-- brain:auto:end -->
