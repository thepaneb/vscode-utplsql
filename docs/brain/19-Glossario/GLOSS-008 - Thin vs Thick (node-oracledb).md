---
id: GLOSS-008
tipo: glossario
titulo: "Thin vs Thick (node-oracledb)"
dominio: banco
status: ativo
verificado: 2026-09-23
implementacao: []
testes: []
regras: []
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
<!-- brain:auto:end -->
