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
implementacao: ["scripts/db-matrix/run.sh", "scripts/db-matrix/matrix.env", "scripts/db-matrix/parse-version.cjs", "scripts/db-matrix/bootstrap.sh", "docker/db-matrix/compose.yaml", ".vscode-test.thick-full.mjs", "src/test/integration/thickSetup.ts"]
testes: ["src/test/unit/matrixConfig.test.ts", "src/test/unit/scriptsCli.test.ts", "src/test/integration/thickLegacyE2E.test.ts", "src/test/integration/thickFullGuard.test.ts"]
prds: ["PRD-72", "PRD-84", "PRD-123", "PRD-124", "PRD-125", "PRD-150"]
requisitos: ["PRD-123/RNF1", "PRD-123/RNF3", "PRD-124/RF4", "PRD-125/RF4", "PRD-125/RNF3", "PRD-125/RNF4", "PRD-150/RF1", "PRD-150/RF3", "PRD-150/RF5"]
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
O **CI** roda o full thin em PR de `release/**`/caminho crítico, o nightly 23free
completo e a matriz semanal 18xe/21xe em **full** (o smoke fica no dispatch
`matrix-smoke`; o 19ee entra no semanal quando as credenciais EE estão nos
secrets). O **matrix-thick** semanal cobre 18xe/21xe/23free em thick smoke. O **thick smoke** (5 testes) roda no nightly/dispatch com Instant
Client baixado no runner, no **23free e no 11g**. O `--thick-full` (PRD-125/150)
roda o full no 23free com guarda `oracledb.thin === false` e reciclagem do pool
após abort; skips documentados (UI, multi-root, thin-only, DBMS_DEBUG, no 11g
`UTPLSQL_LEGACY` e, em todo o thick, timeout/cancelamento porque `break()` não
preempta o execute bloqueante de forma confiável) ficam fora. O 23free thick-full roda no
**nightly**; o 11g full local fecha com skips e o dispatch `thick-full-11g`
segue como probe experimental. O eixo thin segue inalterado.

## Pré-condições

`.env` com as credenciais do compose (`ORACLE_AUTH_USER`/`ORACLE_AUTH_TOKEN`) e Docker
disponível. Para thick, `ORACLE_CLIENT_LIB_DIR` (Instant Client); no 11g,
`ORACLE_CLIENT_LIB_DIR_11XE` tem precedência.

## Exceções

`npm run db:matrix` é o orquestrador local para todas as versões (11g, 12.2,
19ee etc.). No CI, `.github/workflows/integration.yml` roda o thin nightly
(23ai full), a matriz semanal 18c/21c full, o `matrix-thick` semanal
(18c/21c/23ai thick smoke) e o thick-full 23ai nightly; o 11g entra por dispatch
thick. O `ci.yml` cobre apenas compile/lint/test:unit. `--only` restringe aos
bancos pedidos; sem Docker/credenciais a matriz local não roda. O 11g só é
executado no eixo `--thick`.

## Justificativa

Garantir que extensão e driver funcionem em todas as versões suportadas (piso 12.2,
`NFR-001`), nos dois modos de cliente, com o ambiente reprodutível por compose.

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - Regras]]
- 📄 PRDs: [[prd-72-db-test-matrix|PRD-72]] · [[prd-84-oracle-122-support|PRD-84]] · [[prd-123-oracle-11g-support|PRD-123]] · [[prd-124-oracledb-26-upgrade|PRD-124]] · [[prd-125-thick-full-matrix-ci|PRD-125]] · [[prd-150-thick-full-true-pool-recovery|PRD-150]]
- 🎯 Requisitos: [[prd-123-oracle-11g-support|PRD-123 RNF1]] · [[prd-123-oracle-11g-support|PRD-123 RNF3]] · [[prd-124-oracledb-26-upgrade|PRD-124 RF4]] · [[prd-125-thick-full-matrix-ci|PRD-125 RF4]] · [[prd-125-thick-full-matrix-ci|PRD-125 RNF3]] · [[prd-125-thick-full-matrix-ci|PRD-125 RNF4]] · [[prd-150-thick-full-true-pool-recovery|PRD-150 RF1]] · [[prd-150-thick-full-true-pool-recovery|PRD-150 RF3]] · [[prd-150-thick-full-true-pool-recovery|PRD-150 RF5]]
- 🧩 Código: [[COD - run.sh]] · [[COD - matrix.env]] · [[COD - parse-version.cjs]] · [[COD - bootstrap.sh]] · [[COD - compose.yaml]] · [[COD - .vscode-test.thick-full.mjs]] · [[COD - thickSetup.ts]]
- 🧪 Testes: [[TST - matrixConfig.test.ts]] · [[TST - scriptsCli.test.ts]] · [[TST - thickLegacyE2E.test.ts]] · [[TST - thickFullGuard.test.ts]]
- ↩️ Referenciada por: [[ADR-011 - Thick mode opt-in e matriz de bancos|ADR-011]] · [[DEP-vscode-test]] · [[Database-requirements]] · [[NFR-001 - Compatibilidade com Oracle e piso do utPLSQL|NFR-001]] · [[PIPE-integration - Integration (Oracle)|PIPE-integration]] · [[Tests]] · [[prd-123-oracle-11g-support|PRD-123]] · [[prd-124-oracledb-26-upgrade|PRD-124]] · [[prd-125-thick-full-matrix-ci|PRD-125]] · [[prd-150-thick-full-true-pool-recovery|PRD-150]] · [[prd-72-db-test-matrix|PRD-72]] · [[prd-84-oracle-122-support|PRD-84]]
<!-- brain:auto:end -->
