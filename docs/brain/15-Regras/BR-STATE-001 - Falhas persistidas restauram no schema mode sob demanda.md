---
id: BR-STATE-001
aliases: [BR-STATE-001]
tipo: regra
titulo: Falhas persistidas restauram no schema mode sob demanda
dominio: estado
status: ativo
severidade: alta
fonte: codigo
verificado: 2026-11-08
implementacao: ["src/state.ts", "src/extension.ts", "src/commands/run.ts", "src/commands/debug.ts"]
testes: ["src/test/unit/state.test.ts", "src/test/unit/runCommandsExec.test.ts", "src/test/unit/debugCommands.test.ts"]
prds: ["PRD-148"]
requisitos: ["PRD-148/RF4"]
interno: true
tags: ["estado", "schema"]
---
## Enunciado

Após reload no schema mode, `utplsql:hasFailures` é derivado de `lastResults`
(`hasFailedResults()`) sem depender de itens materializados. `Run Failed` e
`Debug Failed` materializam a árvore lazy (`collectAllItems`) quando há falhas
persistidas sem `lastFailedItems` e então resolvem os itens. Ids antigos sem
schema (`test:<pkg>.<proc>`) são resolvidos por package/proc.

## Pré-condições

Snapshot `utplsql.lastRunSnapshot` com pelo menos um status `failed`/`error`.

## Exceções

Itens removidos do workspace são ignorados; sem correspondência, o comando avisa
que não há falhas.

## Justificativa

No modo schema a árvore é lazy; sem isso, o restore após reload ficava vazio e
os comandos de reexecução/depuração não encontravam os testes.

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - Regras]]
- 📄 PRDs: [[prd-148-execution-state-reliability|PRD-148]]
- 🎯 Requisitos: [[prd-148-execution-state-reliability|PRD-148 RF4]]
- 🧩 Código: [[COD - state.ts]] · [[COD - extension.ts]] · [[COD - run.ts]] · [[COD - debug.ts]]
- 🧪 Testes: [[TST - state.test.ts]] · [[TST - runCommandsExec.test.ts]] · [[TST - debugCommands.test.ts]]
- ↩️ Referenciada por: [[Architecture]] · [[prd-148-execution-state-reliability|PRD-148]]
<!-- brain:auto:end -->
