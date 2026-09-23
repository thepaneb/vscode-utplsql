---
id: BR-EXEC-005
tipo: regra
titulo: Buffer de saída é limpo antes de cada run
dominio: execucao
status: ativo
severidade: alta
fonte: codigo
verificado: 2026-09-23
implementacao: ["src/oracleRunner.ts:518", "src/oracleRunner.ts:520", "src/oracleRunner.ts:523"]
testes: ["src/test/integration/dbPaths.test.ts", "src/test/integration/schemaRun.test.ts"]
prds: ["PRD-11"]
requisitos: ["PRD-11/RF3"]
tags: ["execucao"]
---
## Enunciado

Se um run começa, então DELETE FROM <schema>UT_OUTPUT_BUFFER_TMP e DELETE FROM <schema>UT_OUTPUT_BUFFER_INFO_TMP são executados em conn1 com autoCommit antes do ut_runner.run.

## Pré-condições

Prefixo de schema já descoberto em conn1.

## Exceções

Nenhuma; a limpeza é parte do fluxo obrigatório antes do run.

## Justificativa

As tabelas temporárias persistem entre execuções; sem o DELETE, mensagens antigas reapareceriam no output/poll e corromperiam o XML.

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - Regras]]
- 📄 PRDs: [[prd-11-streaming-results|PRD-11]]
- 🎯 Requisitos: [[prd-11-streaming-results|PRD-11 RF3]]
<!-- brain:auto:end -->
