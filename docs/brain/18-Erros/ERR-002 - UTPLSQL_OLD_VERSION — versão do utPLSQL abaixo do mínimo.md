---
id: ERR-002
tipo: erro
titulo: UTPLSQL_OLD_VERSION — versão do utPLSQL abaixo do mínimo
dominio: setup
codigo: UTPLSQL_OLD_VERSION
status: ativo
severidade: alta
verificado: 2026-09-23
implementacao: ["src/quickfix.ts:105", "src/oracleRunner.ts:14", "src/discovery.ts:410"]
testes: ["src/test/unit/discovery.test.ts"]
regras: ["BR-PARSE-008"]
tags: ["erro", "setup"]
---
## Sintoma

Diagnóstico de setup aponta versão antiga; recursos como get_suites_info não são usados.

## Causa

Versão do utPLSQL instalada menor que UTPLSQL_MIN_VERSION (3.1.0); a API de descoberta DB-first exige UTPLSQL_SUITES_INFO_MIN_VERSION (3.1.3).

## Correção

Atualizar o utPLSQL no banco; enquanto isso a extensão cai no fallback ALL_OBJECTS/ALL_SOURCE.

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - Erros]]
- 📐 Regras: [[BR-PARSE-008 - DB-first com gate de versão 3.1.3 e modos de fonte auto-database-file|BR-PARSE-008]]
<!-- brain:auto:end -->
