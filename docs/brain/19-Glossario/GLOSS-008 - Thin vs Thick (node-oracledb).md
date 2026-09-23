---
id: GLOSS-008
aliases: [GLOSS-008]
tipo: glossario
titulo: "Thin vs Thick (node-oracledb)"
dominio: banco
status: ativo
verificado: 2026-09-23
implementacao: []
testes: []
regras: ["BR-CONN-012"]
relacionado: ["[[ADR-011 - Thick mode opt-in e matriz de bancos]]", "[[TPL-ORACLEDB - node-oracledb]]"]
tags: ["banco"]
---
## Definição

Modos do driver: **thin** (puro JS, sem Instant Client, padrão) e **thick**
(usa Instant Client; necessário para NNE). Fixado na primeira conexão.

## Onde aparece

`oracleClient.ts` (`ensureOracleClient`), settings de thick.

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - Glossario]]
- 📐 Regras: [[BR-CONN-012 - Thick opt-in, fixado na primeira chamada e idempotente|BR-CONN-012]]
- 🔗 [[ADR-011 - Thick mode opt-in e matriz de bancos]] · [[TPL-ORACLEDB - node-oracledb]]
<!-- brain:auto:end -->
