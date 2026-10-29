---
id: NFR-001
aliases: [NFR-001]
tipo: nfr
titulo: "Compatibilidade com Oracle e piso do utPLSQL"
dominio: compatibilidade
status: ativo
verificado: 2026-10-29
implementacao: []
testes: []
regras: ["BR-EXEC-004", "BR-PARSE-008", "BR-TEST-001", "BR-CONN-019"]
relacionado: ["[[ADR-011 - Thick mode opt-in e matriz de bancos]]", "[[TPL-ORACLEDB - node-oracledb]]", "[[MOC - Oracle]]"]
requisitos: ["PRD-84/RF1", "PRD-84/RF3", "PRD-123/RF0", "PRD-123/RF5"]
tags: ["compatibilidade"]
---
## Requisito

Suportar Oracle **11.2+ em thick mode** e **12.2+ em thin** (com piso
alternativo de utPLSQL) e instalações shared; `UTPLSQL_MIN_VERSION` 3.1.0,
`get_suites_info` a partir de 3.1.3. O thin do node-oracledb tem piso 12.1; o
11g usa utPLSQL 3.1.x e cobertura via `DBMS_PROFILER`.

## Justificativa

Bases legadas convivem com versões novas do framework.

## Verificação

`semverLt`, fallback `ALL_OBJECTS/ALL_SOURCE`, PRD-84/PRD-123.

## Validação (2026-10-29)

Matriz de bancos Oracle local (`scripts/db-matrix/run.sh`), suíte de integração
**completa (thin)** + **thick**, **0 falhas** — ver
[[BR-TEST-001 - Matriz de bancos Oracle cobre 12.2-23ai em thin e thick]].

| Banco | utPLSQL | thin (suíte completa) | thick |
|---|---|---|---|
| 11.2 (11g R2) | v3.1.14 | n/a (thin 12.1+) | 4 passing (thickMode + legacy) |
| 12.2 | v3.1.14 | 94 passing / 6 pending | 2 passing |
| 18xe | v3.2.3 | 95 passing / 5 pending | 2 passing |
| 19ee | v3.2.3 | 95 passing / 5 pending | 2 passing |
| 21xe | v3.2.3 | 95 passing / 5 pending | 2 passing |
| 23free | v3.2.3 | 95 passing / 5 pending | 2 passing |

> O 23free exigiu recriar o volume na 2ª tentativa (`--clean`) após
> `ORA-01578` (bloco corrompido) no bootstrap — falha de ambiente, não do projeto.

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - NFR]]
- 📐 Regras: [[BR-EXEC-004 - Prefixo de schema utPLSQL descoberto via ALL_SYNONYMS|BR-EXEC-004]] · [[BR-PARSE-008 - DB-first com gate de versão 3.1.3 e modos de fonte auto-database-file|BR-PARSE-008]] · [[BR-TEST-001 - Matriz de bancos Oracle cobre 12.2-23ai em thin e thick|BR-TEST-001]] · [[BR-CONN-019 - Oracle 11g (11.2) exige thick mode; thin tem piso 12.1|BR-CONN-019]]
- 🎯 Requisitos: [[prd-84-oracle-122-support|PRD-84 RF1]] · [[prd-84-oracle-122-support|PRD-84 RF3]] · [[prd-123-oracle-11g-support|PRD-123 RF0]] · [[prd-123-oracle-11g-support|PRD-123 RF5]]
- 🔗 [[ADR-011 - Thick mode opt-in e matriz de bancos]] · [[TPL-ORACLEDB - node-oracledb]] · [[MOC - Oracle]]
- ↩️ Referenciada por: [[09-configuration]] · [[11-debugger]]
<!-- brain:auto:end -->
