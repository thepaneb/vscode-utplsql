---
id: GLOSS-009
aliases: [GLOSS-009]
tipo: glossario
titulo: "Shared install (utPLSQL)"
dominio: banco
status: ativo
verificado: 2026-09-23
implementacao: []
testes: []
regras: ["BR-EXEC-004"]
relacionado: ["[[MOC - Oracle]]"]
tags: ["banco"]
---
## Definição

Instalação do utPLSQL em um schema (ex.: UT3) compartilhado por outros schemas via
synonyms/grants. A extensão descobre o prefixo pela ordem de resolução de nomes do
Oracle: pacote no schema atual → synonym privado → synonym público → pacote
acessível em `ALL_OBJECTS`.

## Onde aparece

`oracleRunner.ts` (`discoverUtplsqlSchema`), ERR-001. No shared install, o prefixo
qualifica `ut_runner.run`, `UT_VARCHAR2_LIST`, `UT_REPORTERS`, reporters e o buffer.

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - Glossario]]
- 📐 Regras: [[BR-EXEC-004 - Prefixo de schema utPLSQL descoberto via ALL_SYNONYMS|BR-EXEC-004]]
- 🔗 [[MOC - Oracle]]
<!-- brain:auto:end -->
