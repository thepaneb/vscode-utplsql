---
id: BR-TEST-002
aliases: [BR-TEST-002]
tipo: regra
titulo: Testes de integração exigem banco e são skip sem UTPLSQL_CONN
dominio: teste
status: ativo
severidade: media
fonte: codigo
verificado: 2026-09-28
implementacao: ["src/test/integration/helpers.ts", "src/charsetSupport.ts"]
testes: ["src/test/integration/schemaRun.test.ts", "src/test/integration/v014-features.test.ts", "src/test/unit/charsetSupport.test.ts"]
prds: ["PRD-15"]
tags: ["teste"]
---
## Enunciado

Os testes de integração (`src/test/integration/*.test.ts`) só executam com banco:
cada arquivo declara `describeDB`/`describeTns`/`describeThick` a partir de
`hasConnection()` (ou `process.env.UTPLSQL_CONN`) e usa `describe.skip` quando o
banco falta — nunca falham por ausência de conexão. Os helpers compartilhados ficam
em `helpers.ts`.

## Pré-condições

`UTPLSQL_CONN` definido (`.env`). Para thick, também `ORACLE_CLIENT_LIB_DIR` e
`UTPLSQL_THICK_TEST=1`.

## Exceções

Arquivos opt-in por variável própria: `v014-tns.test.ts` (`UTPLSQL_TNS_ALIAS` +
`UTPLSQL_TNS_ADMIN`/`TNS_ADMIN`) e `thickMode.test.ts` (`UTPLSQL_THICK_TEST=1` +
`ORACLE_CLIENT_LIB_DIR`).

## Justificativa

Permitir `npm run test:integration` sem banco (suíte verde por *skip*) sem mascarar
falhas reais quando a conexão existe.

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - Regras]]
- 📄 PRDs: [[prd-15-integration-tests-real-db|PRD-15]]
- 🧩 Código: [[COD - helpers.ts]] · [[COD - charsetSupport.ts]]
- 🧪 Testes: [[TST - schemaRun.test.ts]] · [[TST - v014-features.test.ts]] · [[TST - charsetSupport.test.ts]]
- ↩️ Referenciada por: [[Tests]] · [[prd-15-integration-tests-real-db|PRD-15]]
<!-- brain:auto:end -->
