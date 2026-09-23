---
id: BR-UI-005
tipo: regra
titulo: Status bar - gating por setting, throttle de 200ms e ícone por falha/erro
dominio: ui
status: ativo
severidade: media
fonte: codigo
verificado: 2026-09-23
implementacao: ["src/statusBar.ts:21", "src/statusBar.ts:43", "src/statusBar.ts:62", "src/config.ts:111"]
testes: ["src/test/unit/statusBar.test.ts"]
prds: ["PRD-25"]
requisitos: ["PRD-25/RF1", "PRD-25/RF2", "PRD-25/RF4"]
tags: ["ui"]
---
## Enunciado

A status bar só atualiza se utplsql.statusBar.enabled for true; chamadas de showRunning dentro de 200ms da anterior são ignoradas; o ícone é testing-failed quando failed>0 ou errored>0, senão testing-passed.

## Pré-condições

Setting statusBar.enabled true (default).

## Exceções

Com statusBarEnabled false, showIdle/showRunning/showResults retornam silenciosamente sem exibir.

## Justificativa

Evita flood de updates no showRunning chamado por suite e normaliza o resumo passed/total + duração.

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - Regras]]
- 📄 PRDs: [[prd-25-status-bar-indicator|PRD-25]]
- 🎯 Requisitos: [[prd-25-status-bar-indicator|PRD-25 RF1]] · [[prd-25-status-bar-indicator|PRD-25 RF2]] · [[prd-25-status-bar-indicator|PRD-25 RF4]]
- ↩️ Referenciada por: [[05-ux-components]]
<!-- brain:auto:end -->
