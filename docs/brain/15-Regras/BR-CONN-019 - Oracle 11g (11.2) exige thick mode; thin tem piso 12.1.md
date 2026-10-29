---
id: BR-CONN-019
aliases: [BR-CONN-019]
tipo: regra
titulo: Oracle 11g (11.2) exige thick mode; thin tem piso 12.1
dominio: conexao
status: ativo
severidade: media
fonte: codigo
verificado: 2026-10-29
implementacao: ["scripts/db-matrix/matrix.env", "scripts/db-matrix/run.sh", "scripts/db-matrix/parse-version.cjs", "src/oracleClient.ts", "src/discovery.ts"]
testes: ["src/test/unit/matrixConfig.test.ts", "src/test/unit/discovery.test.ts", "src/test/integration/thickLegacyE2E.test.ts"]
prds: ["PRD-123"]
requisitos: ["PRD-123/RF1", "PRD-123/RF3", "PRD-123/RF4", "PRD-123/RF5", "PRD-123/RNF2"]
tags: ["conexao", "oracle", "teste"]
---
## Enunciado

Oracle **11.2 (11g R2)** é suportado **somente em thick mode**. O thin do
node-oracledb tem piso **12.1** (11g recebe `NJS-138`), então a matriz marca a
entrada `11xe` com `client=thick` e o `run.sh` **recusa** `--smoke`/suíte thin
antes de subir o Docker. O 11g usa utPLSQL **3.1.x** (`v3.1.14`) e cobertura via
`DBMS_PROFILER`; o `discovery.ts` usa SQL portátil (`ROWNUM`), sem `FETCH FIRST`.

## Pré-condições

Imagem `gvenzl/oracle-xe:11-slim` (pinada por digest), `ORACLE_PASSWORD`,
`DB_DATA_DIR=/u01/app/oracle/oradata` e Instant Client 19c+ (global ou
`ORACLE_CLIENT_LIB_DIR_11XE`).

## Exceções

Thin no 11g é impossível por construção do driver; a mensagem de erro deve
orientar `--thick`/`oracleClientMode: thick`. O 11g não tem PDB (serviço `XE`).

## Justificativa

Declarar o suporte ao legado sem prometer um caminho thin que o driver não
oferece; a matriz local é o gate (imagens grandes, fora do CI).

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - Regras]]
- 📄 PRDs: [[prd-123-oracle-11g-support|PRD-123]]
- 🎯 Requisitos: [[prd-123-oracle-11g-support|PRD-123 RF1]] · [[prd-123-oracle-11g-support|PRD-123 RF3]] · [[prd-123-oracle-11g-support|PRD-123 RF4]] · [[prd-123-oracle-11g-support|PRD-123 RF5]] · [[prd-123-oracle-11g-support|PRD-123 RNF2]]
- 🧩 Código: [[COD - matrix.env]] · [[COD - run.sh]] · [[COD - parse-version.cjs]] · [[COD - oracleClient.ts]] · [[COD - discovery.ts]]
- 🧪 Testes: [[TST - matrixConfig.test.ts]] · [[TST - discovery.test.ts]] · [[TST - thickLegacyE2E.test.ts]]
- ↩️ Referenciada por: [[Database-requirements]] · [[NFR-001 - Compatibilidade com Oracle e piso do utPLSQL|NFR-001]] · [[prd-123-oracle-11g-support|PRD-123]]
<!-- brain:auto:end -->
