---
id: BR-UI-008
aliases: [BR-UI-008]
tipo: regra
titulo: Diagnósticos de compilação mapeiam ALL_ERRORS e usam source utPLSQL Compilation
dominio: diagnostico
status: ativo
severidade: alta
fonte: codigo
verificado: 2026-09-23
implementacao: ["src/compilationDiagnostics.ts", "src/oracleRunner.ts", "src/runner.ts"]
testes: ["src/test/unit/oracleRunner.test.ts", "src/test/integration/oracleCapabilities.test.ts", "src/test/integration/compilationDiagnosticsE2E.test.ts", "src/test/unit/compilationDiagnostics.test.ts", "src/test/unit/compilationDiagnosticsDriverMissing.test.ts"]
prds: ["PRD-28", "PRD-148"]
requisitos: ["PRD-28/RF2", "PRD-28/RF3", "PRD-148/RF3"]
tags: ["diagnostico"]
---
## Enunciado

Após cada run, erros de compilação PL/SQL (ALL_ERRORS do schema da conexão) são publicados no Problems Panel com source utPLSQL Compilation, severidade Error, linha 1-based para 0-based. Desde a PRD-148 RF3, suites e fontes de produção são indexadas por nome (Map, sem `find` em loop) e o arquivo é escolhido pelo tipo do erro (`PACKAGE→.pks`, `PACKAGE BODY→.pkb`, `TYPE→.typ`, `TYPE BODY→.tpb`, `FUNCTION→.fnc`, `PROCEDURE→.prc`, `TRIGGER→.trg`); sem arquivo resolvível, o diagnóstico fica na suite de mesmo nome; sem suite, é omitido.

## Pré-condições

utplsql.compilationDiagnostics.enabled true, conexão resolvida por resolveConnectionNoPrompt, oracledb disponível e cachedItems populado.

## Exceções

Se o schema não puder ser extraído da conexão ou a query falhar, a função retorna silenciosamente (best-effort); erros sem arquivo nem suite correspondente são descartados.

## Justificativa

Permite pular direto para a linha do erro no código PL/SQL, sempre de forma best-effort sem quebrar o fluxo de teste.

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - Regras]]
- 📄 PRDs: [[prd-28-plsql-compilation-diagnostics|PRD-28]] · [[prd-148-execution-state-reliability|PRD-148]]
- 🎯 Requisitos: [[prd-28-plsql-compilation-diagnostics|PRD-28 RF2]] · [[prd-28-plsql-compilation-diagnostics|PRD-28 RF3]] · [[prd-148-execution-state-reliability|PRD-148 RF3]]
- 🧩 Código: [[COD - compilationDiagnostics.ts]] · [[COD - oracleRunner.ts]] · [[COD - runner.ts]]
- 🧪 Testes: [[TST - oracleRunner.test.ts]] · [[TST - oracleCapabilities.test.ts]] · [[TST - compilationDiagnosticsE2E.test.ts]] · [[TST - compilationDiagnostics.test.ts]] · [[TST - compilationDiagnosticsDriverMissing.test.ts]]
- ↩️ Referenciada por: [[07-diagnostics-and-validation]] · [[Diagnostics-and-quick-fix]] · [[Troubleshooting]] · [[prd-148-execution-state-reliability|PRD-148]] · [[prd-28-plsql-compilation-diagnostics|PRD-28]]
<!-- brain:auto:end -->
