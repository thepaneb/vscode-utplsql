---
id: BR-ARCH-002
aliases: [BR-ARCH-002]
tipo: regra
titulo: Efeitos colaterais da execução passam pelo event bus tipado
dominio: arquitetura
status: ativo
severidade: media
interno: true
fonte: codigo
verificado: 2026-11-11
implementacao: ["src/runEvents.ts", "src/runner.ts", "src/oracleRunner.ts", "src/commands/run.ts", "src/commands/deps.ts", "src/extension.ts"]
testes: ["src/test/unit/runEvents.test.ts", "src/test/unit/runner.test.ts", "src/test/unit/runCommandsExec.test.ts"]
prds: ["PRD-128"]
requisitos: ["PRD-128/RF1", "PRD-128/RF2", "PRD-128/RF3", "PRD-128/RF4", "PRD-128/RNF1", "PRD-128/RNF2", "PRD-128/RNF3"]
tags: ["arquitetura", "eventos"]
---
## Enunciado

O ciclo de execução emite eventos tipados (`suite:start`, `run:start`,
`run:complete`, `coverage:generated`, `coverage:html:written`,
`run:cancelled`, `run:error`) em um `RunEventBus` síncrono e puro
(`src/runEvents.ts`), criado na ativação e descartado no `deactivate`. Status
bar, decorações, diagnóstico de cobertura e diagnósticos de compilação assinam
o bus; os callbacks antigos continuam aceitos como adapters.

## Controle

`createRunEventBus()` expõe `on`/`off`/`emit`/`emitAsync`/`dispose`;
`executeRun` recebe o bus opcional e o injeta em `OracleRunOptions`;
`finalizeRun` emite `run:complete`/`coverage:generated`; `commands/run.ts`
registra os assinantes e remove as chamadas inline de decoração/diagnóstico.
`emitAsync` aguarda listeners assíncronos sem que um listener derrube o run.

## Justificativa

Adicionar consumidores sem mudar a assinatura do orquestrador e testar efeitos
colaterais sem mockar `vscode`, mantendo a ordem observável dos eventos.

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - Regras]]
- 📄 PRDs: [[prd-128-event-bus-internal|PRD-128]]
- 🎯 Requisitos: [[prd-128-event-bus-internal|PRD-128 RF1]] · [[prd-128-event-bus-internal|PRD-128 RF2]] · [[prd-128-event-bus-internal|PRD-128 RF3]] · [[prd-128-event-bus-internal|PRD-128 RF4]] · [[prd-128-event-bus-internal|PRD-128 RNF1]] · [[prd-128-event-bus-internal|PRD-128 RNF2]] · [[prd-128-event-bus-internal|PRD-128 RNF3]]
- 🧩 Código: [[COD - runEvents.ts]] · [[COD - runner.ts]] · [[COD - oracleRunner.ts]] · [[COD - run.ts]] · [[COD - deps.ts]] · [[COD - extension.ts]]
- 🧪 Testes: [[TST - runEvents.test.ts]] · [[TST - runner.test.ts]] · [[TST - runCommandsExec.test.ts]]
- ↩️ Referenciada por: [[Architecture]] · [[prd-128-event-bus-internal|PRD-128]]
<!-- brain:auto:end -->
