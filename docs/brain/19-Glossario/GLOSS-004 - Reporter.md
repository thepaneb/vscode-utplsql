---
id: GLOSS-004
aliases: [GLOSS-004]
tipo: glossario
titulo: "Reporter"
dominio: utplsql
status: ativo
verificado: 2026-09-23
implementacao: []
testes: []
regras: ["BR-EXEC-006"]
relacionado: ["[[03-results-and-reporting]]"]
tags: ["utplsql"]
---
## Definição

Componente do utPLSQL que serializa a execução (documentação, JUnit, cobertura).
A extensão lê todos da mesma `UT_OUTPUT_BUFFER_TMP`.

## Onde aparece

`oracleRunner.ts` (montagem de `ut_reporters`), `junit.ts`, `cobertura.ts`.

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - Glossario]]
- 📐 Regras: [[BR-EXEC-006 - Reporters gravam na mesma UT_OUTPUT_BUFFER_TMP; CLOB não é usada|BR-EXEC-006]]
- 🔗 [[03-results-and-reporting]]
<!-- brain:auto:end -->
