---
id: BR-COB-006
aliases: [BR-COB-006]
tipo: regra
titulo: Cobertura = explicit ?? coverageAlways; comandos *Coverage forçam true
dominio: cobertura
status: ativo
severidade: media
fonte: codigo
verificado: 2026-10-02
implementacao: ["src/coverageDecision.ts:12", "src/state.ts:32", "src/commands/run.ts:341"]
testes: ["src/test/unit/coverageDecision.test.ts"]
prds: ["PRD-54"]
requisitos: ["PRD-54/RF1", "PRD-54/RF3", "PRD-54/RF4", "PRD-54/RNF1"]
tags: ["cobertura"]
---

# BR-COB-006 — Cobertura = explicit ?? coverageAlways; comandos *Coverage forçam true

## Enunciado

Nos entry points `runAll`/`runFile`/`runAtCursor`/`rerunLast`/`runByTag` a
cobertura efetiva é `explicitCoverage ?? state.coverageAlways`; os comandos
`*Coverage` passam `true` explícito e o auto-run (BR-EXEC-016) usa a mesma flag.

## Pré-condições

`state.coverageAlways` inicializado em `false` (não persistido).

## Exceções

A flag de sessão não altera `.vscode/settings.json`; com o reporter de cobertura
ausente o runner segue a degradação atual (BR-EXEC-013).

## Justificativa

Centraliza a decisão de cobertura e evita divergência entre comando, CodeLens e
auto-run.

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - Regras]]
- 📄 PRDs: [[prd-54-coverage-toggle|PRD-54]]
- 🎯 Requisitos: [[prd-54-coverage-toggle|PRD-54 RF1]] · [[prd-54-coverage-toggle|PRD-54 RF3]] · [[prd-54-coverage-toggle|PRD-54 RF4]] · [[prd-54-coverage-toggle|PRD-54 RNF1]]
- 🧩 Código: [[COD - coverageDecision.ts]] · [[COD - state.ts]] · [[COD - run.ts]]
- 🧪 Testes: [[TST - coverageDecision.test.ts]]
- ↩️ Referenciada por: [[prd-50-auto-run-on-save|PRD-50]] · [[prd-54-coverage-toggle|PRD-54]]
<!-- brain:auto:end -->
