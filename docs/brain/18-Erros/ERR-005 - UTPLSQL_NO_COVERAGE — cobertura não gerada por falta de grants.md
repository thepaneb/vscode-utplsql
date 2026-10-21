---
id: ERR-005
aliases: [ERR-005]
tipo: erro
titulo: UTPLSQL_NO_COVERAGE — cobertura não gerada por falta de grants
dominio: cobertura
codigo: UTPLSQL_NO_COVERAGE
status: ativo
severidade: alta
verificado: 2026-10-21
implementacao: ["src/quickfix.ts:152", "src/quickfix.ts:164", "src/runner.ts:204", "src/oracleRunner.ts:1008", "src/commands/utility.ts:13"]
testes: ["src/test/unit/quickfix.test.ts", "src/test/unit/runner.test.ts"]
regras: ["BR-COB-001", "BR-EXEC-013"]
tags: [erros, cobertura]
---
## Sintoma

O run termina mas o relatório de cobertura não é gerado; um aviso aparece no
output e o diagnóstico `UTPLSQL_NO_COVERAGE` (source `utPLSQL Setup`) é publicado
no Problems Panel.

## Causa

Falta GRANT EXECUTE ON SYS.DBMS_PROFILER (e DBMS_PLSQL_CODE_COVERAGE) para o schema; ou o reporter de cobertura não existe no banco.

## Correção

Executar os grants (utplsql.copyGrantsToClipboard) e rodar novamente; a extensão
degrada para "sem cobertura" sem abortar os testes. O diagnóstico é limpo
automaticamente quando a cobertura volta a ser gerada.

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - Erros]]
- 📐 Regras: [[BR-COB-001 - Cobertura Oracle exige GRANT EXECUTE ON SYS.DBMS_PROFILER|BR-COB-001]] · [[BR-EXEC-013 - Reporter de cobertura só entra se existir no banco|BR-EXEC-013]]
- 🧩 Código: [[COD - quickfix.ts]] · [[COD - runner.ts]] · [[COD - oracleRunner.ts]] · [[COD - utility.ts]]
- 🧪 Testes: [[TST - quickfix.test.ts]] · [[TST - runner.test.ts]]
- ↩️ Referenciada por: [[BR-COB-001 - Cobertura Oracle exige GRANT EXECUTE ON SYS.DBMS_PROFILER|BR-COB-001]] · [[BR-EXEC-013 - Reporter de cobertura só entra se existir no banco|BR-EXEC-013]]
<!-- brain:auto:end -->
