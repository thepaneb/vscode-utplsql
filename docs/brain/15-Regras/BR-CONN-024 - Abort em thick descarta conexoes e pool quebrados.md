---
id: BR-CONN-024
aliases: [BR-CONN-024]
tipo: regra
titulo: Abort em thick descarta conexões e pool quebrados
dominio: conexao
status: ativo
severidade: alta
fonte: codigo
verificado: 2026-11-08
implementacao: ["src/oracleRunner.ts"]
testes: ["src/test/unit/oracleRunner.test.ts", "src/test/integration/runTimeoutE2E.test.ts", "src/test/integration/schemaRun.test.ts"]
prds: ["PRD-150"]
requisitos: ["PRD-150/RF2"]
interno: true
tags: ["conexao", "thick", "pool"]
---
## Enunciado

Quando um run termina por timeout/cancelamento, `executeRunOracleCore` marca
as conexões para `close({ drop: true })` (não as devolve quebradas ao pool) e
`executeRunOracle` descarta o pool corrente (`discardOraclePool`), fechando-o em
background com `close(0)`. O próximo `ensurePool` cria uma instância limpa.

## Pré-condições

Run abortado (`RunAbortedError` com `outcome` `timedOut`/`cancelled`), em
qualquer modo; o cenário observado é o thick.

## Exceções

Erros que não são abort (ex.: falha de conexão antes do run) mantêm o
fechamento normal; o caminho thin continua funcionando com a mesma invalidação.

## Justificativa

Em thick, conexões quebradas por `break()` podiam voltar ao pool e o próximo
checkout pendurava (timeout seguinte, schema mode e streaming falhavam em
cascata). Descartar o pool e dropar as sessões elimina o resíduo.

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - Regras]]
- 📄 PRDs: [[prd-150-thick-full-true-pool-recovery|PRD-150]]
- 🎯 Requisitos: [[prd-150-thick-full-true-pool-recovery|PRD-150 RF2]]
- 🧩 Código: [[COD - oracleRunner.ts]]
- 🧪 Testes: [[TST - oracleRunner.test.ts]] · [[TST - runTimeoutE2E.test.ts]] · [[TST - schemaRun.test.ts]]
- ↩️ Referenciada por: [[10-development-tooling]] · [[Contributing]] · [[Tests]] · [[prd-150-thick-full-true-pool-recovery|PRD-150]]
<!-- brain:auto:end -->
