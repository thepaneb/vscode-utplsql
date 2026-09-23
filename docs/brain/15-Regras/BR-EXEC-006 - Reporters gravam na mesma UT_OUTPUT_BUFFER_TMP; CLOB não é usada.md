---
id: BR-EXEC-006
tipo: regra
titulo: Reporters gravam na mesma UT_OUTPUT_BUFFER_TMP; CLOB não é usada
dominio: execucao
status: ativo
severidade: media
fonte: codigo
verificado: 2026-09-23
implementacao: ["src/oracleRunner.ts:525", "src/oracleRunner.ts:735"]
testes: ["src/test/integration/dbPaths.test.ts", "src/test/integration/v012-features.test.ts"]
tags: ["execucao"]
---
## Enunciado

Se há execução, então todos os reporters configurados (documentação, JUnit, cobertura e extras) escrevem na mesma <schema>UT_OUTPUT_BUFFER_TMP (VARCHAR2), lida por conn2 via SELECT; a UT_OUTPUT_CLOB_BUFFER_TMP não é referenciada em nenhum ponto.

## Pré-condições

Lista de reporters montada como ut_reporters(...) no PL/SQL do run.

## Exceções

Nenhuma no código atual; não há fallback para buffer CLOB.

## Justificativa

A extensão consome um único stream misto (doc + JUnit + cobertura) da tabela VARCHAR2 e separa os formatos por prefixo de linha.

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - Regras]]
<!-- brain:auto:end -->
