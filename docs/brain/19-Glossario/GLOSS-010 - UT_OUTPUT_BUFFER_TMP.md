---
id: GLOSS-010
aliases: [GLOSS-010]
tipo: glossario
titulo: "UT_OUTPUT_BUFFER_TMP"
dominio: banco
status: ativo
verificado: 2026-09-23
implementacao: []
testes: []
regras: ["BR-EXEC-006"]
relacionado: ["[[ENT-006 - OutputBuffer]]"]
tags: ["banco"]
---
## Definição

Tabela temporária (VARCHAR2) onde os reporters escrevem a saída; a extensão faz
poll por `message_id`. O buffer CLOB não é usado.

## Onde aparece

`oracleRunner.ts` (limpeza + poll + roteamento).

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - Glossario]]
- 📐 Regras: [[BR-EXEC-006 - Reporters gravam na mesma UT_OUTPUT_BUFFER_TMP; CLOB não é usada|BR-EXEC-006]]
- 🔗 [[ENT-006 - OutputBuffer]]
- ↩️ Referenciada por: [[ENT-006 - OutputBuffer|ENT-006]]
<!-- brain:auto:end -->
