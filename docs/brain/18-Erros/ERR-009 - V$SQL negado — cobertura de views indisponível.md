---
id: ERR-009
tipo: erro
titulo: V$SQL negado — cobertura de views indisponível
dominio: cobertura
codigo: V$SQL
status: ativo
severidade: baixa
verificado: 2026-09-23
implementacao: ["src/viewCoverage.ts:122", "src/viewCoverage.ts:93"]
testes: ["src/test/unit/viewCoverage.test.ts"]
regras: ["BR-COB-003"]
tags: ["erro", "cobertura"]
---
## Sintoma

A cobertura de views (opt-in) não produz resultado; aviso de V$SQL negado.

## Causa

Falta GRANT SELECT ON V$SQL para o schema (ou timeout de 5s / oracledb ausente).

## Correção

Conceder SELECT ON V$SQL ou desabilitar utplsql.sqlCoverageEnabled; qualquer falha silencia e mantém o resultado atual.

