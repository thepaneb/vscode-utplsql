---
id: GLOSS-009
tipo: glossario
titulo: "Shared install (utPLSQL)"
dominio: banco
status: ativo
verificado: 2026-09-23
implementacao: []
testes: []
regras: []
tags: ["banco"]
---
## Definição

Instalação do utPLSQL em um schema (ex.: UT3) compartilhado por outros schemas via
synonyms/grants. A extensão descobre o prefixo por `ALL_SYNONYMS`.

## Onde aparece

`oracleRunner.ts` (`discoverUtplsqlSchema`), ERR-001.
