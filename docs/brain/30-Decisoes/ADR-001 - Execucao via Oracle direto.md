---
tipo: decisao
id: ADR-001
aliases: [ADR-001]
status: aceita
modulo: oracle
data: 2026-09-15
tags: [adr, oracle, oracledb]
---

# ADR-001 - Execução via Oracle direto (node-oracledb, streaming)

## Contexto

Precisamos rodar testes utPLSQL a partir do VSCode sem depender de CLI externa.
O utPLSQL roda dentro do próprio banco, então a extensão precisa (a) disparar a execução
e (b) capturar a saída em tempo real e no final.

## Decisão

Usar **node-oracledb** em modo *thin* (sem Instant Client) e duas conexões:

```
conn1 → ut_runner.run(...) bloqueante
conn2 → poll UT_OUTPUT_BUFFER_TMP a cada 200ms → doc (real-time) + XML (final)
```

Todos os reporters (doc, JUnit, coverage) escrevem na **mesma**
`UT_OUTPUT_BUFFER_TMP` (VARCHAR2). `UT_OUTPUT_CLOB_BUFFER_TMP` não é usado.

## Alternativas consideradas

- **utPLSQL CLI** — exige instalação separada (Java/CLI) e configuração de conexão extra.
- **SQLcl** — dependência pesada e formato de saída difícil de parsear em tempo real.
- **Modo thick (Instant Client)** — obriga instalar cliente Oracle nativo; fricção alta.
- **Buffer CLOB** — descartado; os reporters usam o VARCHAR2.

## Consequências

- **Positivas:** zero dependência externa; streaming real-time via poll; `oracledb` é
  `dependencies` (thin).
- **Negativas / trade-offs:** polling de 200ms introduz latência; o buffer é compartilhado
  por todos os reporters (precisa limpar antes de cada run); cancelamento precisa de
  `conn.break()` + `Promise.race`.
- **Relacionadas:** shared install sem grants → `ORA-00942` → mensagem amigável.

## Referências

- [[MOC - Oracle]]
- [[MOC - Arquitetura]]
- `src/oracleRunner.ts` (`executeRunOracle`, `discoverUtplsqlSchema`)
- [wiki/Oracle-direct-execution](../../wiki/Oracle-direct-execution.md)
