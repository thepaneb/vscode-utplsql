---
id: BR-COB-003
tipo: regra
titulo: Cobertura de views via V$SQL é opt-in e best-effort
dominio: cobertura
status: ativo
severidade: media
fonte: codigo
verificado: 2026-09-23
implementacao: ["src/runner.ts:202", "src/config.ts:119", "src/viewCoverage.ts:93", "src/viewCoverage.ts:122", "src/viewCoverage.ts:31"]
testes: ["src/test/unit/viewCoverage.test.ts", "src/test/unit/config.test.ts", "src/test/unit/runner.test.ts"]
prds: ["PRD-12"]
requisitos: ["PRD-12/RF2"]
tags: ["cobertura"]
---
## Enunciado

A cobertura booleana de views (via V$SQL, executada=100% e não executada=0%) só roda se utplsql.sqlCoverageEnabled for true, após a cobertura normal; exige GRANT SELECT ON V$SQL e, em qualquer falha (sem oracledb, V$SQL inacessível, timeout de 5s), silencia e mantém o resultado atual.

## Pré-condições

Setting sqlCoverageEnabled true (default false) e existir diretório <root>/<sourcePath>/views/ com arquivos .sql.

## Exceções

Se não houver arquivos de views ou não houver oracledb, retorna imediatamente; a query filtra por parsing_schema_name = user da conexão.

## Justificativa

V$SQL pode ser negado por grants e não deve comprometer o run de testes; o match é por word-boundary do nome do objeto no SQL_TEXT.

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - Regras]]
- 📄 PRDs: [[prd-12-sql-coverage|PRD-12]]
- 🎯 Requisitos: [[prd-12-sql-coverage|PRD-12 RF2]]
- ↩️ Referenciada por: [[ERR-009 - V$SQL negado — cobertura de views indisponível|ERR-009]] · [[SEC-009 - Grants são copiados para o clipboard, nunca executados automaticamente|SEC-009]]
<!-- brain:auto:end -->
