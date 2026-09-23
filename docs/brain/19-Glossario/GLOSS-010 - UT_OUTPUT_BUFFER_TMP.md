---
id: GLOSS-010
tipo: glossario
titulo: "UT_OUTPUT_BUFFER_TMP"
dominio: banco
status: ativo
verificado: 2026-09-23
implementacao: []
testes: []
regras: []
tags: ["banco"]
---
## Definição

Tabela temporária (VARCHAR2) onde os reporters escrevem a saída; a extensão faz
poll por `message_id`. O buffer CLOB não é usado.

## Onde aparece

`oracleRunner.ts` (limpeza + poll + roteamento).
