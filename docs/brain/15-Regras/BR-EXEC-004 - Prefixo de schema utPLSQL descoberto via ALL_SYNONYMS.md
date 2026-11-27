---
id: BR-EXEC-004
aliases: [BR-EXEC-004]
tipo: regra
titulo: Prefixo de schema utPLSQL descoberto pela ordem de resolução do Oracle
dominio: execucao
status: ativo
severidade: alta
fonte: codigo
verificado: 2026-11-26
implementacao: ["src/oracleRunner.ts"]
testes: ["src/test/unit/oracleRunner.test.ts", "src/test/integration/oracleCapabilities.test.ts"]
prds: ["PRD-43", "PRD-64"]
requisitos: ["PRD-11/RF3"]
interno: true
tags: ["execucao"]
---
## Enunciado

Se o utPLSQL estiver acessível, então discoverUtplsqlSchema resolve o owner na ordem de nomes do Oracle — pacote UT_RUNNER no schema atual → synonym privado do schema atual → synonym público → pacote acessível em ALL_OBJECTS (preferindo UT3) — e retorna `<owner>.` (ex.: `UT3.`) para qualificar `ut_runner`, tipos, reporters e buffer; no install próprio retorna string vazia.

## Pré-condições

Chamada com uma conexão cujo `execute` aceita SQL sem binds. O owner resolvido é validado por `sanitizeSchemaPrefix` antes de qualquer concatenação.

## Exceções

`ALL_SYNONYMS`/`ALL_OBJECTS` inacessível (ex.: ORA-00942) é engolido em log debug e resulta em prefixo vazio; também tolera resultado em formato array ou objeto. Synonym que aponta para o próprio schema atual resulta em prefixo vazio. Sem synonym, o fallback procura qualquer pacote `UT_RUNNER` visível, preferindo `UT3`.

## Justificativa

Suporta install próprio (prefixo vazio, resolve pelo schema atual) e shared install por synonym privado, synonym público ou grant direto no pacote (ex.: `DEMO` → `UT3`). Grant não cria synonym: o prefixo descoberto é o que permite qualificar os objetos usados pelo runner.

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - Regras]]
- 📄 PRDs: [[prd-43-schema-db-discovery|PRD-43]] · [[prd-64-oracle-only-migration|PRD-64]]
- 🎯 Requisitos: [[prd-11-streaming-results|PRD-11 RF3]]
- 🧩 Código: [[COD - oracleRunner.ts]]
- 🧪 Testes: [[TST - oracleRunner.test.ts]] · [[TST - oracleCapabilities.test.ts]]
- ↩️ Referenciada por: [[02-test-execution]] · [[GLOSS-009 - Shared install (utPLSQL)|GLOSS-009]] · [[NFR-001 - Compatibilidade com Oracle e piso do utPLSQL|NFR-001]] · [[TPL-UTPLSQL - utPLSQL (framework no banco)|TPL-UTPLSQL]] · [[prd-43-schema-db-discovery|PRD-43]] · [[prd-64-oracle-only-migration|PRD-64]]
<!-- brain:auto:end -->
