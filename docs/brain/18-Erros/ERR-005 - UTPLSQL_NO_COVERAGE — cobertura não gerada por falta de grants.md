---
id: ERR-005
aliases: [ERR-005]
tipo: erro
titulo: UTPLSQL_NO_COVERAGE — cobertura não gerada por falta de grants
dominio: cobertura
codigo: UTPLSQL_NO_COVERAGE
status: ativo
severidade: alta
verificado: 2026-09-23
implementacao: ["src/quickfix.ts:157", "src/commands/utility.ts:13", "src/oracleRunner.ts:528"]
testes: ["src/test/unit/quickfix.test.ts"]
regras: ["BR-COB-001", "BR-EXEC-013"]
tags: [erros, cobertura]
---
## Sintoma

O run termina mas o relatório de cobertura não é gerado; um aviso aparece no output.

## Causa

Falta GRANT EXECUTE ON SYS.DBMS_PROFILER (e DBMS_PLSQL_CODE_COVERAGE) para o schema; ou o reporter de cobertura não existe no banco.

## Correção

Executar os grants (utplsql.copyGrantsToClipboard) e rodar novamente; a extensão degrada para "sem cobertura" sem abortar os testes.

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - Erros]]
- 📐 Regras: [[BR-COB-001 - Cobertura Oracle exige GRANT EXECUTE ON SYS.DBMS_PROFILER|BR-COB-001]] · [[BR-EXEC-013 - Reporter de cobertura só entra se existir no banco|BR-EXEC-013]]
<!-- brain:auto:end -->
