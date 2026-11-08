---
id: BR-UI-004
aliases: [BR-UI-004]
tipo: regra
titulo: utplsql:hasFailures derivado de lastFailedItems (failed ou error)
dominio: ui
status: ativo
severidade: alta
fonte: codigo
verificado: 2026-09-23
implementacao: ["src/oracleRunner.ts", "src/state.ts", "src/extension.ts", "package.json"]
testes: ["src/test/unit/oracleRunner.test.ts", "src/test/unit/runner.test.ts", "src/test/unit/state.test.ts"]
prds: ["PRD-31", "PRD-148"]
requisitos: ["PRD-27/RF4", "PRD-31/RF4", "PRD-148/RF4"]
interno: true
tags: ["ui"]
---
## Enunciado

Após cada run, lastFailedItems recebe os itens cujo status mapeado é failed ou error, e utplsql:hasFailures é setado true se houver pelo menos um, false caso contrário. No schema mode, após reload, o context key também é derivado de `lastResults` (`hasFailedResults()`), mesmo antes de a árvore lazy ser materializada (PRD-148 RF4).

## Pré-condições

Terminou o parsing do JUnit e o resultMap foi aplicado aos leafTests.

## Exceções

Status skipped/passed não contam como falha.

## Justificativa

O comando/keybinding utplsql.runFailed só aparece quando há falhas da última execução.

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - Regras]]
- 📄 PRDs: [[prd-31-smart-rerun-patterns|PRD-31]] · [[prd-148-execution-state-reliability|PRD-148]]
- 🎯 Requisitos: [[prd-27-default-keybindings|PRD-27 RF4]] · [[prd-31-smart-rerun-patterns|PRD-31 RF4]] · [[prd-148-execution-state-reliability|PRD-148 RF4]]
- 🧩 Código: [[COD - oracleRunner.ts]] · [[COD - state.ts]] · [[COD - extension.ts]] · [[COD - package.json]]
- 🧪 Testes: [[TST - oracleRunner.test.ts]] · [[TST - runner.test.ts]] · [[TST - state.test.ts]]
- ↩️ Referenciada por: [[05-ux-components]] · [[prd-148-execution-state-reliability|PRD-148]] · [[prd-31-smart-rerun-patterns|PRD-31]]
<!-- brain:auto:end -->
