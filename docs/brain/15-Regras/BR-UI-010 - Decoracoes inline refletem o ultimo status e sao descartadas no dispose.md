---
id: BR-UI-010
aliases: [BR-UI-010]
tipo: regra
titulo: Decorações inline refletem o último status e são descartadas no dispose
dominio: ui
status: ativo
severidade: baixa
fonte: codigo
verificado: 2026-09-29
implementacao: ["src/decorations.ts:54"]
testes: ["src/test/unit/decorations.test.ts"]
prds: ["PRD-26"]
tags: ["ui", "decoracoes"]
---
## Enunciado

O `DecorationManager` aplica as decorações inline (passed/failed/skipped) nos
editores visíveis a partir do último resultado, agrupa por arquivo e **limpa** as
decorações ao final/`dispose` — nunca deixa marca órfã depois de um novo run.

## Pré-condições

Resultados aplicados por `applyResultsFromCases` (`PAT-003`); editor com o arquivo
da suíte aberto.

## Exceções

Sem resultado para o arquivo, nenhuma decoração é aplicada (e as antigas são
removidas).

## Justificativa

Feedback visual imediato do teste na linha, sem estado residual entre execuções.

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - Regras]]
- 📄 PRDs: [[prd-26-inline-test-decorations|PRD-26]]
- 🧩 Código: [[COD - decorations.ts]]
- 🧪 Testes: [[TST - decorations.test.ts]]
- ↩️ Referenciada por: [[Editor-integration]] · [[prd-26-inline-test-decorations|PRD-26]]
<!-- brain:auto:end -->