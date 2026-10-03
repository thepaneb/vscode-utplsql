---
id: BR-UI-012
aliases: [BR-UI-012]
tipo: regra
titulo: Item de status bar alterna o modo global de cobertura (sessão, não persiste)
dominio: ui
status: ativo
severidade: baixa
fonte: codigo
verificado: 2026-10-02
implementacao: ["src/statusBar.ts:50", "src/coverageDecision.ts:26", "src/commands/run.ts:340"]
testes: ["src/test/unit/statusBar.test.ts", "src/test/unit/coverageDecision.test.ts"]
prds: ["PRD-54"]
requisitos: ["PRD-54/RF2", "PRD-54/RNF1"]
tags: ["ui", "cobertura"]
---

# BR-UI-012 — Item de status bar alterna o modo global de cobertura (sessão, não persiste)

## Enunciado

Um item à direita da status bar usa `command = utplsql.toggleCoverage` e texto
`$(beaker) Coverage: off` / `$(beaker) $(check) Coverage: on` conforme
`state.coverageAlways`, atualizado a cada toggle; não persiste entre sessões (o
tooltip comunica isso).

## Pré-condições

Setting `utplsql.statusBar.enabled` true.

## Exceções

Com a status bar desabilitada o item não é exibido/atualizado (como BR-UI-005).

## Justificativa

Dar feedback visível do modo que aumenta o custo no banco (DBMS_PROFILER).

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - Regras]]
- 📄 PRDs: [[prd-54-coverage-toggle|PRD-54]]
- 🎯 Requisitos: [[prd-54-coverage-toggle|PRD-54 RF2]] · [[prd-54-coverage-toggle|PRD-54 RNF1]]
- 🧩 Código: [[COD - statusBar.ts]] · [[COD - coverageDecision.ts]] · [[COD - run.ts]]
- 🧪 Testes: [[TST - statusBar.test.ts]] · [[TST - coverageDecision.test.ts]]
- ↩️ Referenciada por: [[prd-54-coverage-toggle|PRD-54]]
<!-- brain:auto:end -->
