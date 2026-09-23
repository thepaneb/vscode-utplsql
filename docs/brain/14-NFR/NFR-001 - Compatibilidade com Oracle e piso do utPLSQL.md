---
id: NFR-001
tipo: nfr
titulo: "Compatibilidade com Oracle e piso do utPLSQL"
dominio: compatibilidade
status: ativo
verificado: 2026-09-23
implementacao: []
testes: []
regras: []
relacionado: ["[[ADR-011 - Thick mode opt-in e matriz de bancos]]", "[[TPL-ORACLEDB - node-oracledb]]", "[[MOC - Oracle]]"]
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
- 🔗 [[ADR-011 - Thick mode opt-in e matriz de bancos]] · [[TPL-ORACLEDB - node-oracledb]] · [[MOC - Oracle]]
<!-- brain:auto:end -->
