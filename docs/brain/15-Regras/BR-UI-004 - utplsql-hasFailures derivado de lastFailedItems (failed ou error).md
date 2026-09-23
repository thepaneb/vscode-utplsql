---
id: BR-UI-004
tipo: regra
titulo: utplsql:hasFailures derivado de lastFailedItems (failed ou error)
dominio: ui
status: ativo
severidade: alta
fonte: codigo
verificado: 2026-09-23
implementacao: ["src/oracleRunner.ts:792", "src/oracleRunner.ts:798", "package.json:666"]
testes: ["src/test/unit/oracleRunner.test.ts", "src/test/unit/runner.test.ts"]
tags: ["ui"]
---
## Enunciado

Após cada run, lastFailedItems recebe os itens cujo status mapeado é failed ou error, e utplsql:hasFailures é setado true se houver pelo menos um, false caso contrário.

## Pré-condições

Terminou o parsing do JUnit e o resultMap foi aplicado aos leafTests.

## Exceções

Status skipped/passed não contam como falha.

## Justificativa

O comando/keybinding utplsql.runFailed só aparece quando há falhas da última execução.

