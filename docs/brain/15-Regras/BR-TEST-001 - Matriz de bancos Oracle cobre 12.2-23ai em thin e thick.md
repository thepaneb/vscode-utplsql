---
id: BR-TEST-001
aliases: [BR-TEST-001]
tipo: regra
titulo: Matriz de bancos Oracle cobre 11.2–23ai em thin e thick
dominio: teste
status: ativo
severidade: media
fonte: codigo
verificado: 2026-10-31
implementacao: ["scripts/db-matrix/run.sh", "scripts/db-matrix/matrix.env", "scripts/db-matrix/parse-version.cjs", "scripts/db-matrix/bootstrap.sh", "docker/db-matrix/compose.yaml"]
testes: ["src/test/unit/matrixConfig.test.ts", "src/test/unit/scriptsCli.test.ts", "src/test/integration/thickLegacyE2E.test.ts"]
prds: ["PRD-72", "PRD-84", "PRD-123", "PRD-124", "PRD-125"]
requisitos: ["PRD-123/RNF1", "PRD-123/RNF3", "PRD-124/RF4", "PRD-125/RF4"]
tags: ["teste", "oracle"]
---
## Enunciado

`npm run db:matrix` (`scripts/db-matrix/run.sh`) executa a suíte de integração contra
as versões locais da matriz — **11.2 (11g R2), 12.2, 18c, 19c, 21c e 23ai** — em
**thin** e, com `--thick`, em **thick** (Instant Client). O **11.2 é thick-only**
(thin do node-oracledb tem piso 12.1) e usa utPLSQL `v3.1.14` + `DBMS_PROFILER`;
o 12.2 também usa `v3.1.14` (piso alternativo, `PRD-84`). Opções: `--list`,
`--only`, `--smoke`, `--thick`; o 5º campo do `matrix.env` (`client`) declara
`thick` para o 11g e a guarda recusa o eixo thin antes do Docker. A matriz roda
com o **node-oracledb 26** (PRD-124): 23free full, 11g thick, 12.2/21xe smoke.
O **CI** roda o full thin em PR de `release/**`/caminho crítico e a matriz
semanal 18xe/21xe em smoke; o `--thick-full` é experimental (PRD-125).

## Pré-condições

`.env` com as credenciais do compose (`ORACLE_AUTH_USER`/`ORACLE_AUTH_TOKEN`) e Docker
disponível. Para thick, `ORACLE_CLIENT_LIB_DIR` (Instant Client); no 11g,
`ORACLE_CLIENT_LIB_DIR_11XE` tem precedência.

## Exceções

A matriz é **local** — o CI (`ci.yml`) roda só `compile`/`lint`/`test:unit` e a
matriz não entra no VSIX (`PRD-83`). `--only` restringe aos bancos pedidos; sem
Docker/credenciais ela não roda. O 11g só é executado no eixo `--thick`.

## Justificativa

Garantir que extensão e driver funcionem em todas as versões suportadas (piso 12.2,
`NFR-001`), nos dois modos de cliente, com o ambiente reprodutível por compose.

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - Regras]]
- 📄 PRDs: [[prd-72-db-test-matrix|PRD-72]] · [[prd-84-oracle-122-support|PRD-84]] · [[prd-123-oracle-11g-support|PRD-123]] · [[prd-124-oracledb-26-upgrade|PRD-124]] · [[prd-125-thick-full-matrix-ci|PRD-125]]
- 🎯 Requisitos: [[prd-123-oracle-11g-support|PRD-123 RNF1]] · [[prd-123-oracle-11g-support|PRD-123 RNF3]] · [[prd-124-oracledb-26-upgrade|PRD-124 RF4]] · [[prd-125-thick-full-matrix-ci|PRD-125 RF4]]
- 🧩 Código: [[COD - run.sh]] · [[COD - matrix.env]] · [[COD - parse-version.cjs]] · [[COD - bootstrap.sh]] · [[COD - compose.yaml]]
- 🧪 Testes: [[TST - matrixConfig.test.ts]] · [[TST - scriptsCli.test.ts]] · [[TST - thickLegacyE2E.test.ts]]
- ↩️ Referenciada por: [[ADR-011 - Thick mode opt-in e matriz de bancos|ADR-011]] · [[DEP-vscode-test]] · [[Database-requirements]] · [[NFR-001 - Compatibilidade com Oracle e piso do utPLSQL|NFR-001]] · [[PIPE-integration - Integration (Oracle)|PIPE-integration]] · [[Tests]] · [[prd-123-oracle-11g-support|PRD-123]] · [[prd-124-oracledb-26-upgrade|PRD-124]] · [[prd-125-thick-full-matrix-ci|PRD-125]] · [[prd-72-db-test-matrix|PRD-72]] · [[prd-84-oracle-122-support|PRD-84]]
<!-- brain:auto:end -->
