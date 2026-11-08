---
id: BR-CONN-023
aliases: [BR-CONN-023]
tipo: regra
titulo: Pool ocioso fecha ao fim da operação; nunca conexão em uso
dominio: conexao
status: ativo
severidade: media
interno: true
fonte: codigo
verificado: 2026-11-05
implementacao: ["src/oracleRunner.ts", "src/runner.ts", "src/config.ts"]
testes: ["src/test/unit/oraclePoolActivity.test.ts", "src/test/integration/prd101PoolClose.test.ts", "src/test/integration/prd107Unpriv.test.ts"]
prds: ["PRD-101"]
requisitos: ["PRD-101/RNF1", "PRD-101/RNF2"]
tags: [conexao, pool]
---

## Enunciado

Com `utplsql.oraclePoolCloseAfterRun` ligado (default), a última atividade
Oracle (run, cobertura, export, discovery, validação de setup, fonte virtual,
script ou compile de debug) fecha o pool **somente** quando
`connectionsInUse === 0`. O pool sai do cache **antes** do `close(0)`, então
um `ensurePool` concorrente cria outro em vez de receber um pool fechando.

## Pré-condições

Token `beginOracleActivity`/`end()` idempotente e contador global de atividades.
O `end()` nunca derruba conexão em uso; a falha ao fechar é logada sem
credenciais.

## Exceções

Com o setting desligado, o comportamento é o anterior (pool aquecido). O
cancelamento (`conn.break`) continua sendo tratado pelo fluxo da PRD-66.

## Justificativa

Permite `DROP USER` após a execução sem recarregar o VS Code, sem sacrificar
runs concorrentes nem o cancelamento.
