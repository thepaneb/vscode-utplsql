---
id: BR-EXEC-015
aliases: [BR-EXEC-015]
tipo: regra
titulo: Export com reporter não altera os resultados do Test Explorer
dominio: execucao
status: ativo
severidade: media
fonte: codigo
verificado: 2026-09-28
implementacao: ["src/runner.ts:138", "src/runner.ts:209", "src/oracleRunner.ts:906"]
testes: ["src/test/unit/runExportCommand.test.ts", "src/test/unit/oracleRunner.test.ts", "src/test/integration/v014-features.test.ts"]
prds: ["PRD-76"]
requisitos: ["PRD-76/RF1"]
tags: ["execucao"]
---
## Enunciado

Quando `executeRun`/`executeRunOracle` recebem `exportReporter`, o run usa **apenas** o reporter escolhido, devolve a saída textual e **não** aplica resultados de teste nem cobertura (`applyResultsFromCases`/`applyCoverageFromXml` são pulados), preservando os resultados do Test Explorer.

## Pré-condições

Comando `utPLSQL: Run with Reporter (Export)` (ou `exportReporter` no options).

## Exceções

Erro do export é propagado ao chamador (o run normal, sem `exportReporter`, mantém o tratamento atual). Reporter inexistente aborta o export.

## Justificativa

Permitir exportar a saída de qualquer reporter sem corromper o estado de resultados/cobertura do Test Explorer.

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - Regras]]
- 📄 PRDs: [[prd-76-reporter-export|PRD-76]]
- 🎯 Requisitos: [[prd-76-reporter-export|PRD-76 RF1]]
- 🧩 Código: [[COD - runner.ts]] · [[COD - oracleRunner.ts]]
- 🧪 Testes: [[TST - runExportCommand.test.ts]] · [[TST - oracleRunner.test.ts]] · [[TST - v014-features.test.ts]]
- ↩️ Referenciada por: [[prd-76-reporter-export|PRD-76]]
<!-- brain:auto:end -->
