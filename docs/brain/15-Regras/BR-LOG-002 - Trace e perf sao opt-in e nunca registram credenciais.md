---
id: BR-LOG-002
aliases: [BR-LOG-002]
tipo: regra
titulo: Trace e perf são opt-in e nunca registram credenciais
dominio: logging
status: ativo
severidade: media
interno: true
fonte: codigo
verificado: 2026-11-05
implementacao: ["src/perf.ts", "src/logger.ts", "src/extension.ts"]
testes: ["src/test/unit/perf.test.ts", "src/test/unit/logger.test.ts"]
prds: ["PRD-102"]
requisitos: ["PRD-102/RNF1", "PRD-102/RNF2"]
tags: [logging, performance]
---

## Enunciado

`utplsql.trace`, `utplsql.perf.enabled` e `utplsql.perf.reportFile` são
**desligados por padrão**. Com eles desligados, nenhuma linha de trace/perf é
emitida e o custo é desprezível. O probe (`src/perf.ts`) é puro e testável; o
`reportFile` recebe uma linha JSON por fase (`discovery`, `buildTree`, `run`,
`poll`, `parseXml`).

## Pré-condições

`logger.trace` só emite com `setTraceEnabled(true)`. O sink de perf grava JSONL
sem bloquear a operação; falha de I/O vira warning e nunca derruba o run.

## Exceções

`UTPLSQL_DEBUG=1` continua controlando o console de debug, mas **não** liga o
trace. Nenhum dos dois deve receber connection string, senha ou bind sensível
(SEC-002/BR-CONN-020).

## Justificativa

Permite diagnosticar descoberta, árvore, run, polling e parse em suites
grandes sem poluir o canal ou arriscar credenciais no uso normal.
