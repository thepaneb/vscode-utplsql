---
tipo: moc
status: ativo
verificado: 2026-09-23
modulo: oracle
tags: [moc, oracle, oracledb]
---

# MOC - Oracle

## Crítico — execução direta

- **`oracledb`** é `dependencies` — driver thin (sem Instant Client).
- **`discoverUtplsqlSchema(conn)`**: query `ALL_SYNONYMS` → prefixo `UT3.` nas queries de
  buffer. Suporta shared install.
- **Todos os reporters** (doc, JUnit, coverage) escrevem na mesma
  `UT_OUTPUT_BUFFER_TMP` (VARCHAR2). `UT_OUTPUT_CLOB_BUFFER_TMP` não é usado.
- Shared install sem grants → `ORA-00942` → erro com mensagem amigável.
- Cancelamento: `conn.break()` + `Promise.race`.

## Conexão

- Resolução: `setting → env UTPLSQL_CONN → cache sessão → prompt`. Nunca logada.
- Cobertura Oracle: `ut_file_mapper.build_file_mappings()` + `GRANT EXECUTE ON DBMS_PROFILER`.

## Diagnósticos

- **Compilation**: `compilationDiagnostics.ts` consulta `ALL_ERRORS`. Source `"utPLSQL Compilation"`.
- **Setup**: `SetupValidator.validateOnActivation()` na ativação (conexão via `getOracleInfo`, versão via `semverLt`).
- **Quick-fix**: `UtplsqlCodeActionProvider` em `**/*.pks`. Source `"utPLSQL Setup"`.

## Documentação no repo

- [Oracle-direct-execution](../../../docs/wiki/Oracle-direct-execution.md)
- [Connection](../../../docs/wiki/Connection.md)
- [Database-requirements](../../../docs/wiki/Database-requirements.md)
- [Diagnostics-and-quick-fix](../../../docs/wiki/Diagnostics-and-quick-fix.md)

## Snippets úteis

- [[MOC - Snippets]]
