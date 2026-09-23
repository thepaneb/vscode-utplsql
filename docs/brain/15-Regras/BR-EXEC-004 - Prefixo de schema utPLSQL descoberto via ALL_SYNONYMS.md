---
id: BR-EXEC-004
tipo: regra
titulo: Prefixo de schema utPLSQL descoberto via ALL_SYNONYMS
dominio: execucao
status: ativo
severidade: alta
fonte: codigo
verificado: 2026-09-23
implementacao: ["src/oracleRunner.ts:170", "src/oracleRunner.ts:179", "src/oracleRunner.ts:185", "src/oracleRunner.ts:191"]
testes: ["src/test/unit/oracleRunner.test.ts:670", "src/test/unit/oracleRunner.test.ts:678", "src/test/integration/oracleCapabilities.test.ts:56"]
prds: ["PRD-43", "PRD-64"]
tags: ["execucao"]
---
## Enunciado

Se UT_RUNNER for um synonym público, então discoverUtplsqlSchema retorna <owner>. (ex.: UT3.) para prefixar as queries de buffer; caso contrário (sem linha ou erro) retorna string vazia.

## Pré-condições

Chamada com uma conexão cujo execute aceita SQL sem binds.

## Exceções

ALL_SYNONYMS inacessível (ex.: ORA-00942) é engolido em log debug e resulta em prefixo vazio; também tolera resultado em formato array ou objeto.

## Justificativa

Suporta install próprio (prefixo vazio, resolve pelo schema atual) e shared install (synonym aponta para o owner documentado, ex.: UT3).

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - Regras]]
- 📄 PRDs: [[prd-43-schema-db-discovery|PRD-43]] · [[prd-64-oracle-only-migration|PRD-64]]
<!-- brain:auto:end -->
