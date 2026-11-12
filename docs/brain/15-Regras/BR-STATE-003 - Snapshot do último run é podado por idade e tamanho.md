---
id: BR-STATE-003
aliases: [BR-STATE-003]
tipo: regra
titulo: Snapshot do último run é podado por idade e tamanho
dominio: estado
status: ativo
severidade: media
interno: true
fonte: codigo
verificado: 2026-11-11
implementacao: ["src/state.ts"]
testes: ["src/test/unit/state.test.ts"]
prds: ["PRD-131"]
requisitos: ["PRD-131/RF4", "PRD-131/RNF2"]
tags: ["estado", "persistencia"]
---
## Enunciado

`TestStateManager.persist()` mantém no máximo `PERSIST_MAX_ENTRIES` resultados e
descarta os mais antigos que `PERSIST_MAX_AGE_DAYS`; a poda não muta o estado em
memória e falhas do Memento viram `logger.warn` em vez de rejeição silenciosa.
A migração de snapshots antigos é transparente no `restore()`.

## Controle

Constantes exportadas em `src/state.ts` e teste de round-trip/poda em
`src/test/unit/state.test.ts`.

## Justificativa

Evitar crescimento indefinido do `workspaceState` em sessões longas e workspaces
grandes sem perder o último resultado útil.

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - Regras]]
- 📄 PRDs: [[prd-131-discovery-resilience-cache|PRD-131]]
- 🎯 Requisitos: [[prd-131-discovery-resilience-cache|PRD-131 RF4]] · [[prd-131-discovery-resilience-cache|PRD-131 RNF2]]
- 🧩 Código: [[COD - state.ts]]
- 🧪 Testes: [[TST - state.test.ts]]
- ↩️ Referenciada por: [[Architecture]] · [[prd-131-discovery-resilience-cache|PRD-131]]
<!-- brain:auto:end -->
