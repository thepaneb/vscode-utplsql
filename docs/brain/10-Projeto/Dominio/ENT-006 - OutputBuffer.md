---
id: ENT-006
aliases: [ENT-006]
tipo: entidade
titulo: "OutputBuffer"
dominio: execucao
status: ativo
verificado: 2026-09-23
implementacao: []
testes: []
regras: ["BR-EXEC-006"]
relacionado: ["[[GLOSS-010 - UT_OUTPUT_BUFFER_TMP]]"]
tags: ["execucao"]
---
## Definição

Tabela temporária compartilhada onde os reporters gravam; consumida por poll.

## Atributos

message_id, text, is_finished.

## Onde aparece

`oracleRunner.ts`, GLOSS-010.

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - Dominio]]
- 📐 Regras: [[BR-EXEC-006 - Reporters gravam na mesma UT_OUTPUT_BUFFER_TMP; CLOB não é usada|BR-EXEC-006]]
- 🔗 [[GLOSS-010 - UT_OUTPUT_BUFFER_TMP]]
<!-- brain:auto:end -->
