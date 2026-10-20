---
id: BR-COB-008
aliases: [BR-COB-008]
tipo: regra
titulo: Relatório HTML de cobertura abre no navegador sem segurar o TestRun
dominio: cobertura
status: ativo
severidade: alta
fonte: codigo
verificado: 2026-10-20
implementacao: ["src/coverage.ts:85", "src/coverage.ts:93", "src/coverage.ts:106", "src/coverage.ts:117", "src/oracleRunner.ts:622", "src/oracleRunner.ts:682", "src/oracleRunner.ts:921", "src/oracleRunner.ts:1012", "src/runner.ts:193", "src/runner.ts:243", "package.json:212"]
testes: ["src/test/unit/coverageHtml.test.ts", "src/test/unit/oracleRunner.test.ts", "src/test/unit/runner.test.ts", "src/test/integration/v017-features.test.ts"]
prds: ["PRD-108"]
requisitos: ["PRD-108/RF1", "PRD-108/RF2", "PRD-108/RF3", "PRD-108/RF4", "PRD-108/RNF1", "PRD-108/RNF2"]
tags: ["cobertura", "html"]
---
## Enunciado

Com `utplsql.coverage.htmlReport = true` e cobertura ligada, o runner inclui
`ut_coverage_html_reporter`, captura a saída desse reporter pelo `output_id`
próprio (sem contaminar o XML de JUnit/Cobertura) e grava atomicamente
`test-results/coverage.html` no root da suíte executada (fallback para temp do
SO sem workspace). Depois do `run.end()`, uma notificação fire-and-forget oferece
**Abrir no navegador** e **Salvar em arquivo…**; o HTML nunca é renderizado em
webview e o conteúdo não é logado.

## Pré-condições

Cobertura habilitada, setting `coverage.htmlReport = true` e o reporter
`UT_COVERAGE_HTML_REPORTER` presente no banco.

## Exceções

- Sem o reporter no banco, o HTML é ignorado (best-effort) e o run segue.
- Com a setting desligada, nenhum reporter HTML é adicionado e nenhuma
  notificação é disparada.
- `additionalReporters` com `ut_coverage_html_reporter` não duplica o reporter
  quando a setting está ligada.
- Cancelamento/timeout não grava HTML parcial; o alvo anterior é removido no
  início do run.
- `test-results/` é ignorado pelo `.gitignore`/`.vscodeignore`.

## Justificativa

O painel nativo de cobertura não gera um relatório portátil para compartilhar; o
HTML do utPLSQL inclui o código-fonte e nomes de objetos vindos do banco, então
renderizar em webview seria risco de XSS. Abrir no navegador a partir do arquivo
em disco evita isso. A notificação depois do `run.end()` impede que uma resposta
do usuário prenda o spinner do Test Explorer.

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - Regras]]
- 📄 PRDs: [[prd-108-coverage-html-report|PRD-108]]
- 🎯 Requisitos: [[prd-108-coverage-html-report|PRD-108 RF1]] · [[prd-108-coverage-html-report|PRD-108 RF2]] · [[prd-108-coverage-html-report|PRD-108 RF3]] · [[prd-108-coverage-html-report|PRD-108 RF4]] · [[prd-108-coverage-html-report|PRD-108 RNF1]] · [[prd-108-coverage-html-report|PRD-108 RNF2]]
- 🧩 Código: [[COD - coverage.ts]] · [[COD - oracleRunner.ts]] · [[COD - runner.ts]] · [[COD - package.json]]
- 🧪 Testes: [[TST - coverageHtml.test.ts]] · [[TST - oracleRunner.test.ts]] · [[TST - runner.test.ts]] · [[TST - v017-features.test.ts]]
- ↩️ Referenciada por: [[03-results-and-reporting]] · [[04-code-coverage]] · [[Coverage]] · [[Reporters]] · [[prd-108-coverage-html-report|PRD-108]]
<!-- brain:auto:end -->
