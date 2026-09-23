---
id: BR-UI-008
tipo: regra
titulo: Diagnósticos de compilação mapeiam ALL_ERRORS e usam source utPLSQL Compilation
dominio: diagnostico
status: ativo
severidade: alta
fonte: codigo
verificado: 2026-09-23
implementacao: ["src/compilationDiagnostics.ts:13", "src/compilationDiagnostics.ts:29", "src/compilationDiagnostics.ts:52", "src/compilationDiagnostics.ts:72", "src/runner.ts:97"]
testes: ["src/test/unit/oracleRunner.test.ts", "src/test/integration/oracleCapabilities.test.ts"]
tags: ["diagnostico"]
---
## Enunciado

Após cada run, erros de compilação PL/SQL (ALL_ERRORS do schema da conexão) são publicados no Problems Panel com source utPLSQL Compilation, severidade Error, linha 1-based para 0-based, apenas para erros cujo package casa com o packageName de uma suite descoberta no cachedItems.

## Pré-condições

utplsql.compilationDiagnostics.enabled true, conexão resolvida por resolveConnectionNoPrompt, oracledb disponível e cachedItems populado.

## Exceções

Se o schema não puder ser extraído da conexão ou a query falhar, a função retorna silenciosamente (best-effort); erros sem suite correspondente são descartados.

## Justificativa

Permite pular direto para a linha do erro no código PL/SQL, sempre de forma best-effort sem quebrar o fluxo de teste.

