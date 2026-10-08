---
id: BR-DEBUG-005
aliases: [BR-DEBUG-005]
tipo: regra
titulo: debugAtCursor/debugFailed/debugLast resolvem o alvo e chamam startDebugSession
dominio: debugger
status: ativo
severidade: media
fonte: codigo
verificado: 2026-10-02
implementacao: ["src/debugTargets.ts:22", "src/debugTargets.ts:36", "src/annotation.ts:8", "src/commands/debug.ts:157", "src/commands/debug.ts:185", "src/commands/debug.ts:216"]
testes: ["src/test/unit/debugTargets.test.ts", "src/test/unit/debugCommands.test.ts", "src/test/integration/prd015ExtraE2E.test.ts"]
prds: ["PRD-53"]
requisitos: ["PRD-53/RF1", "PRD-53/RF2", "PRD-53/RF3", "PRD-53/RNF1", "PRD-53/RNF2"]
tags: ["debugger"]
---

# BR-DEBUG-005 — debugAtCursor/debugFailed/debugLast resolvem o alvo e chamam startDebugSession

## Enunciado

`debugAtCursor` usa `findAnnotationAtLine`; `debugFailed` usa
`state.getLastFailedItems()` com QuickPick quando há mais de um; `debugLast`
reproduz `state.getLastRun()` mapeando tipo→package/procName; todos chamam
`startDebugSession(packageName, procName?)` e, sem alvo, avisam sem quebrar.

## Pré-condições

`utplsql.debugger.enabled` true (BR-DEBUG-004); cursor em `.pks` para o at cursor.

## Exceções

Com `utplsql.debugger.enabled` false ⇒ aviso e retorno (RNF1); sem falhas/última
execução ⇒ aviso e retorno; `oracledb` ausente ⇒ mensagem amigável (RNF2); uma
sessão por vez.

## Justificativa

Reaproveitar `lastRun`/`lastFailedItems` (PRD-31) e o adaptador (PRD-33) reduz o
atrito de depurar um teste específico.

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - Regras]]
- 📄 PRDs: [[prd-53-debug-test-variants|PRD-53]]
- 🎯 Requisitos: [[prd-53-debug-test-variants|PRD-53 RF1]] · [[prd-53-debug-test-variants|PRD-53 RF2]] · [[prd-53-debug-test-variants|PRD-53 RF3]] · [[prd-53-debug-test-variants|PRD-53 RNF1]] · [[prd-53-debug-test-variants|PRD-53 RNF2]]
- 🧩 Código: [[COD - debugTargets.ts]] · [[COD - annotation.ts]] · [[COD - debug.ts]]
- 🧪 Testes: [[TST - debugTargets.test.ts]] · [[TST - debugCommands.test.ts]] · [[TST - prd015ExtraE2E.test.ts]]
- ↩️ Referenciada por: [[Debugger]] · [[prd-53-debug-test-variants|PRD-53]]
<!-- brain:auto:end -->
