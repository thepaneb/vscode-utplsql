---
id: BR-TEST-001
aliases: [BR-TEST-001]
tipo: regra
titulo: Matriz de bancos Oracle cobre 12.2–23ai em thin e thick
dominio: teste
status: ativo
severidade: media
fonte: codigo
verificado: 2026-09-28
implementacao: ["scripts/db-matrix/run.sh", "scripts/db-matrix/matrix.env"]
testes: ["src/test/unit/matrixConfig.test.ts", "src/test/unit/scriptsCli.test.ts"]
prds: ["PRD-72", "PRD-84"]
tags: ["teste", "oracle"]
---
## Enunciado

`npm run db:matrix` (`scripts/db-matrix/run.sh`) executa a suíte de integração contra
as versões locais da matriz — **12.2, 18c, 19c, 21c e 23ai** — em **thin** e, com
`--thick`, em **thick** (Instant Client). O banco 12.2 usa utPLSQL `v3.1.14`
(piso alternativo, `PRD-84`). Opções: `--list`, `--only`, `--smoke`, `--thick`.

## Pré-condições

`.env` com as credenciais do compose (`ORACLE_AUTH_USER`/`ORACLE_AUTH_TOKEN`) e Docker
disponível. Para thick, `ORACLE_CLIENT_LIB_DIR` (Instant Client).

## Exceções

A matriz é **local** — o CI (`ci.yml`) roda só `compile`/`lint`/`test:unit` e a
matriz não entra no VSIX (`PRD-83`). `--only` restringe aos bancos pedidos; sem
Docker/credenciais ela não roda.

## Justificativa

Garantir que extensão e driver funcionem em todas as versões suportadas (piso 12.2,
`NFR-001`), nos dois modos de cliente, com o ambiente reprodutível por compose.

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - Regras]]
- 📄 PRDs: [[prd-72-db-test-matrix|PRD-72]] · [[prd-84-oracle-122-support|PRD-84]]
- 🧩 Código: [[COD - run.sh]] · [[COD - matrix.env]]
- 🧪 Testes: [[TST - matrixConfig.test.ts]] · [[TST - scriptsCli.test.ts]]
- ↩️ Referenciada por: [[ADR-011 - Thick mode opt-in e matriz de bancos|ADR-011]] · [[NFR-001 - Compatibilidade com Oracle e piso do utPLSQL|NFR-001]] · [[prd-72-db-test-matrix|PRD-72]] · [[prd-84-oracle-122-support|PRD-84]]
<!-- brain:auto:end -->
