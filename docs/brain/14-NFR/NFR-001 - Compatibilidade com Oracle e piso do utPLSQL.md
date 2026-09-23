---
id: NFR-001
aliases: [NFR-001]
tipo: nfr
titulo: "Compatibilidade com Oracle e piso do utPLSQL"
dominio: compatibilidade
status: ativo
verificado: 2026-09-23
implementacao: []
testes: []
regras: []
relacionado: ["[[ADR-011 - Thick mode opt-in e matriz de bancos]]", "[[TPL-ORACLEDB - node-oracledb]]", "[[MOC - Oracle]]"]
requisitos: ["PRD-84/RF1", "PRD-84/RF3"]
tags: ["compatibilidade"]
---
## Requisito

Suportar Oracle 12.2+ (com piso alternativo de utPLSQL) e instalações shared;
`UTPLSQL_MIN_VERSION` 3.1.0, `get_suites_info` a partir de 3.1.3.

## Justificativa

Bases legadas convivem com versões novas do framework.

## Verificação

`semverLt`, fallback `ALL_OBJECTS/ALL_SOURCE`, PRD-84.

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - NFR]]
- 🎯 Requisitos: [[prd-84-oracle-122-support|PRD-84 RF1]] · [[prd-84-oracle-122-support|PRD-84 RF3]]
- 🔗 [[ADR-011 - Thick mode opt-in e matriz de bancos]] · [[TPL-ORACLEDB - node-oracledb]] · [[MOC - Oracle]]
<!-- brain:auto:end -->
