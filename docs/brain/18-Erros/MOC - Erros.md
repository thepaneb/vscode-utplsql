---
tipo: moc
status: ativo
verificado: 2026-09-23
tags: [moc, erros, err]
---

# MOC - Catálogo de Erros

Erros conhecidos (`ERR-*`): código (`ORA-*`, `NJS-*`, `DPI-*`, `UTPLSQL_*`),
sintoma, causa e correção. Serve de base para o Troubleshooting do README e para
mensagens amigáveis/quick-fixes.

## Todos

```dataview
TABLE codigo, dominio, severidade, status
FROM "18-Erros"
WHERE tipo = "erro"
SORT codigo ASC
```

## Índice (links)

<!-- brain:auto:start:moc-index -->
- [[ERR-001 - ORA-00942 — objeto utPLSQL inacessível (shared install sem grants)]] — `ERR-001`
- [[ERR-002 - UTPLSQL_OLD_VERSION — versão do utPLSQL abaixo do mínimo]] — `ERR-002`
- [[ERR-003 - UTPLSQL_BAD_CONN — credenciais ou connection string inválidas]] — `ERR-003`
- [[ERR-004 - UTPLSQL_THICK_MODE — falha ao iniciar o modo thick (DPI-1047-NJS-090)]] — `ERR-004`
- [[ERR-005 - UTPLSQL_NO_COVERAGE — cobertura não gerada por falta de grants]] — `ERR-005`
- [[ERR-006 - UTPLSQL_INVALID_OBJECTS — objetos UT3 inválidos no banco]] — `ERR-006`
- [[ERR-007 - ORA-04043 — objeto não encontrado ao compilar para debug]] — `ERR-007`
- [[ERR-008 - ALL_SOURCE inacessível na descoberta (package pulado)]] — `ERR-008`
- [[ERR-009 - V$SQL negado — cobertura de views indisponível]] — `ERR-009`
- [[ERR-010 - Erro genérico do ut_runner.run (runner.oracleError)]] — `ERR-010`
- [[ERR-011 - Fonte de package truncada (-10.000 linhas)]] — `ERR-011`
<!-- brain:auto:end -->
