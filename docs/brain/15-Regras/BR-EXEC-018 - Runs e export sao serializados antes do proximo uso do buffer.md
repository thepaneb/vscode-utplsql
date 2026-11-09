---
id: BR-EXEC-018
aliases: [BR-EXEC-018]
tipo: regra
titulo: Runs e export são serializados antes do próximo uso do buffer
dominio: execucao
status: ativo
severidade: critica
fonte: codigo
verificado: 2026-11-08
implementacao: ["src/commands/run.ts"]
testes: ["src/test/unit/runCommandsExec.test.ts"]
prds: ["PRD-148"]
requisitos: ["PRD-148/RF1"]
interno: true
tags: ["execucao", "concorrencia"]
---
## Enunciado

Um novo run (ou export) cancela a execução ativa, mas só inicia depois que a
promise da execução anterior termina de desenrolar. `isRunning()` reflete a
promise pendente, não apenas o token vivo; o `run.end()`/`finalizeRun` antigo
sempre precede o `DELETE`/`ut_runner.run` do próximo.

## Pré-condições

Existe uma execução anterior (token/`CancellationTokenSource`) ativa ou em
unwind.

## Exceções

Uma execução cancelada enquanto aguardava a anterior não inicia; o callback de
fim ainda é disparado para o auto-run poder drenar o `deferred`.

## Justificativa

`UT_OUTPUT_BUFFER_TMP` é compartilhado entre execuções; sem a serialização, o
`finalizeRun` antigo pode aplicar resultados depois do novo e corromper o
estado do Test Explorer.

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - Regras]]
- 📄 PRDs: [[prd-148-execution-state-reliability|PRD-148]]
- 🎯 Requisitos: [[prd-148-execution-state-reliability|PRD-148 RF1]]
- 🧩 Código: [[COD - run.ts]]
- 🧪 Testes: [[TST - runCommandsExec.test.ts]]
- ↩️ Referenciada por: [[Architecture]] · [[prd-148-execution-state-reliability|PRD-148]]
<!-- brain:auto:end -->
