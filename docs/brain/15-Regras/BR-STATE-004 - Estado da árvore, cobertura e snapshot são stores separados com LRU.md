---
id: BR-STATE-004
aliases: [BR-STATE-004]
tipo: regra
titulo: Estado da árvore, cobertura e snapshot são stores separados com LRU
dominio: estado
status: ativo
severidade: media
interno: true
fonte: codigo
verificado: 2026-11-11
implementacao: ["src/state.ts", "src/stateStore/coverageStore.ts", "src/stateStore/testItemIndex.ts", "src/stateStore/runSnapshot.ts", "src/stateStore/persisted.ts", "src/lru.ts", "src/dbSourceProvider.ts"]
testes: ["src/test/unit/stateStore.test.ts", "src/test/unit/state.test.ts", "src/test/unit/dbSourceProvider.test.ts", "src/test/unit/runner.test.ts"]
prds: ["PRD-139"]
requisitos: ["PRD-139/RF1", "PRD-139/RF2", "PRD-139/RF3", "PRD-139/RF4", "PRD-139/RF5", "PRD-139/RNF1", "PRD-139/RNF2"]
tags: ["estado", "cache"]
---
## Enunciado

`TestStateManager` permanece como fachada, mas compõe `CoverageStore` (LRU de
500 entradas), `TestItemIndex` (meta/suiteMap/itemMap/lazy) e `RunSnapshot`
(resultados/último run/Memento). `executeRun` limpa a cobertura no início de um
run com alvos; o cache de documentos virtuais do `dbSourceProvider` é LRU (50) e
a poda do snapshot por idade/tamanho vem da PRD-131.

## Controle

`src/stateStore/*` e `src/lru.ts`; a API pública do manager é preservada para
não quebrar call sites nem a árvore lazy.

## Justificativa

Reduzir o acoplamento e o crescimento de memória em sessões longas sem mudar a
semântica observável de resultados/cobertura.

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - Regras]]
- 📄 PRDs: [[prd-139-state-store-slicing-lru|PRD-139]]
- 🎯 Requisitos: [[prd-139-state-store-slicing-lru|PRD-139 RF1]] · [[prd-139-state-store-slicing-lru|PRD-139 RF2]] · [[prd-139-state-store-slicing-lru|PRD-139 RF3]] · [[prd-139-state-store-slicing-lru|PRD-139 RF4]] · [[prd-139-state-store-slicing-lru|PRD-139 RF5]] · [[prd-139-state-store-slicing-lru|PRD-139 RNF1]] · [[prd-139-state-store-slicing-lru|PRD-139 RNF2]]
- 🧩 Código: [[COD - state.ts]] · [[COD - coverageStore.ts]] · [[COD - testItemIndex.ts]] · [[COD - runSnapshot.ts]] · [[COD - persisted.ts]] · [[COD - lru.ts]] · [[COD - dbSourceProvider.ts]]
- 🧪 Testes: [[TST - stateStore.test.ts]] · [[TST - state.test.ts]] · [[TST - dbSourceProvider.test.ts]] · [[TST - runner.test.ts]]
- ↩️ Referenciada por: [[Architecture]] · [[prd-139-state-store-slicing-lru|PRD-139]]
<!-- brain:auto:end -->
