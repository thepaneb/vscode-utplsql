---
id: BR-EXEC-013
aliases: [BR-EXEC-013]
tipo: regra
titulo: Reporter de cobertura só entra se existir no banco
dominio: execucao
status: ativo
severidade: alta
fonte: codigo
erros: [ERR-005]
verificado: 2026-09-23
implementacao: ["src/oracleRunner.ts:528", "src/oracleRunner.ts:529", "src/oracleRunner.ts:531", "src/oracleRunner.ts:534"]
testes: ["src/test/unit/oracleRunner.test.ts:1989", "src/test/unit/oracleRunner.test.ts:2005"]
prds: ["PRD-12", "PRD-69"]
requisitos: ["PRD-69/RF3"]
tags: ["execucao"]
---
## Enunciado

Se a cobertura foi pedida mas UT_COVERAGE_COBERTURA_REPORTER não consta em ut_runner.get_reporters_list(), então a cobertura é desabilitada e um aviso é escrito no output, em vez de adicionar o reporter.

## Pré-condições

Opção coverage = true.

## Exceções

A checagem (checkReporterExists) é case-insensitive e normaliza prefixo de schema; lista indisponível/erro de acesso é tratada como best-effort.

## Justificativa

Passar um reporter inexistente ao ut_runner.run faria o run inteiro abortar com ORA; degradar para sem cobertura preserva os resultados dos testes.

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - Regras]]
- 📄 PRDs: [[prd-12-sql-coverage|PRD-12]] · [[prd-69-oracle-runner-typed-binds|PRD-69]]
- ⚠️ Erros: [[ERR-005 - UTPLSQL_NO_COVERAGE — cobertura não gerada por falta de grants|ERR-005]]
- 🎯 Requisitos: [[prd-69-oracle-runner-typed-binds|PRD-69 RF3]]
- 🧩 Código: [[COD - oracleRunner.ts]]
- 🧪 Testes: [[TST - oracleRunner.test.ts]]
- ↩️ Referenciada por: [[02-test-execution]] · [[04-code-coverage]] · [[ERR-005 - UTPLSQL_NO_COVERAGE — cobertura não gerada por falta de grants|ERR-005]]
<!-- brain:auto:end -->
