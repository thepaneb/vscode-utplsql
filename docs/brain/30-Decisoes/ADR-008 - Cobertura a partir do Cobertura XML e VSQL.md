---
tipo: decisao
status: aceita
modulo: cobertura
data: 2026-09-23
tags: [adr, cobertura, cobertura-xml, dbms_profiler, vsql]
---

# ADR-008 - Cobertura a partir do Cobertura XML + V$SQL + DBMS_PROFILER

## Contexto

O utPLSQL produz cobertura de código PL/SQL (linhas/declarações) e de objetos SQL.
Precisávamos exibir gutters por linha, percentual por arquivo e cobertura de views,
respeitando source mapping e sem inflar o banco de dados com requisitos.

## Decisão

1. **Parse do Cobertura XML** (reporter `coverage`) para linhas/declarações e
   `DeclarationCoverage` para function coverage (PRD-48).
2. **Source mapping** via `ut_file_mapper.build_file_mappings()` + `GRANT EXECUTE ON
   DBMS_PROFILER`.
3. **Cobertura de views** via `V$SQL` (`viewCoverage.ts`), com aviso amigável
   quando o grant falta.
4. **Escopo configurável** (`utplsql.coverage.*`: include/exclude por objeto e regex
   de schema, `excludeObjects`) para remover ruído de framework (PRD-79).
5. **Tratamento cross-platform** de caminhos (correção Windows, PRD-35).

## Alternativas consideradas

- **Só cobertura de linhas:** perde função/declaração e views.
- **Coletar cobertura pelo cliente:** impossível; a execução é no banco.
- **`UT_OUTPUT_CLOB_BUFFER_TMP`:** descartado — os reporters usam o VARCHAR2
  ([[ADR-001 - Execucao via Oracle direto]]).

## Consequências

- **Positivas:** cobertura de linhas, funções e views; escopo ajustável; grants
  diagnosticados com quick-fix.
- **Negativas / trade-offs:** depende de grants (`DBMS_PROFILER`, `V$SQL`);
  source mapping exige que o arquivo local corresponda ao objeto compilado;
  caminhos cross-platform exigem cuidado.

## Referências

- PRDs: [12](../../prd/completed/prd-12-sql-coverage.md) ·
  [48](../../prd/completed/prd-48-function-coverage.md) ·
  [79](../../prd/completed/prd-79-coverage-scope.md) ·
  [35](../../prd/completed/prd-35-windows-coverage-fix.md)
- Código: `src/cobertura.ts`, `src/coverage.ts`, `src/viewCoverage.ts`,
  `src/plsqlDeclarations.ts`
- [[MOC - Oracle]] · [[TPL-ORACLEDB - node-oracledb]]
