---
id: BR-COB-001
aliases: [BR-COB-001]
tipo: regra
titulo: Cobertura Oracle exige GRANT EXECUTE ON SYS.DBMS_PROFILER
dominio: cobertura
status: ativo
severidade: alta
fonte: codigo
erros: [ERR-005]
verificado: 2026-09-23
implementacao: ["src/commands/utility.ts:13", "src/quickfix.ts:150", "src/i18nLocales.ts:98", "package.json:130"]
testes: ["src/test/unit/quickfix.test.ts"]
prds: ["PRD-12", "PRD-32"]
requisitos: ["PRD-32/RF3", "PRD-32/RF5"]
tags: ["cobertura"]
---
## Enunciado

A geração de cobertura depende de GRANT EXECUTE ON SYS.DBMS_PROFILER (e DBMS_PLSQL_CODE_COVERAGE) para o schema; quando o relatório não é gerado, o comando utplsql.copyGrantsToClipboard copia os grants para o clipboard e um diagnóstico UTPLSQL_NO_COVERAGE (source utPLSQL Setup) oferece o quick-fix correspondente.

## Pré-condições

Run com cobertura habilitado e conexão Oracle válida.

## Exceções

Objetos do framework utPLSQL (UT3/UT_*) devem ser excluídos via coverage.excludeObjects; sem o grant, mensagens i18n orientam a executar o grant.

## Justificativa

DBMS_PROFILER é recurso privilegiado; a extensão não pode conceder grants e precisa orientar o usuário.

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - Regras]]
- 📄 PRDs: [[prd-12-sql-coverage|PRD-12]] · [[prd-32-quickfix-setup-diagnostics|PRD-32]]
- ⚠️ Erros: [[ERR-005 - UTPLSQL_NO_COVERAGE — cobertura não gerada por falta de grants|ERR-005]]
- 🎯 Requisitos: [[prd-32-quickfix-setup-diagnostics|PRD-32 RF3]] · [[prd-32-quickfix-setup-diagnostics|PRD-32 RF5]]
- 🧩 Código: [[COD - utility.ts]] · [[COD - quickfix.ts]] · [[COD - i18nLocales.ts]] · [[COD - package.json]]
- 🧪 Testes: [[TST - quickfix.test.ts]]
- ↩️ Referenciada por: [[04-code-coverage]] · [[07-diagnostics-and-validation]] · [[ERR-005 - UTPLSQL_NO_COVERAGE — cobertura não gerada por falta de grants|ERR-005]] · [[SEC-009 - Grants são copiados para o clipboard, nunca executados automaticamente|SEC-009]]
<!-- brain:auto:end -->
