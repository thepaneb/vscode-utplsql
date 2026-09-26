---
id: BR-EXEC-007
aliases: [BR-EXEC-007]
tipo: regra
titulo: Poll do buffer a cada 200ms por message_id incremental
dominio: execucao
status: ativo
severidade: critica
fonte: codigo
verificado: 2026-09-23
implementacao: ["src/oracleRunner.ts:727", "src/oracleRunner.ts:734", "src/oracleRunner.ts:741", "src/oracleRunner.ts:753"]
testes: ["src/test/unit/oracleRunner.test.ts:1790", "src/test/unit/oracleRunner.test.ts:1869"]
prds: ["PRD-11"]
requisitos: ["PRD-11/RF3"]
tags: ["execucao"]
---
## Enunciado

Se o run ainda não terminou, então conn2 executa SELECT message_id, text, is_finished FROM <schema>UT_OUTPUT_BUFFER_TMP WHERE message_id > :last ORDER BY message_id a cada cerca de 200ms, avançando lastMsgId; erro no poll é ignorado e linhas com TEXT nulo são puladas.

## Pré-condições

Loop principal ativo com conn1 ainda executando o ut_runner.run.

## Exceções

Exceção do SELECT em conn2 é engolida em log debug (ex.: conn1 ainda não escreveu); o loop continua até done.

## Justificativa

Streaming em tempo real sem bloquear; falhas transitórias do buffer não abortam a execução.

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - Regras]]
- 📄 PRDs: [[prd-11-streaming-results|PRD-11]]
- 🎯 Requisitos: [[prd-11-streaming-results|PRD-11 RF3]]
- 🧩 Código: [[COD - oracleRunner.ts]]
- 🧪 Testes: [[TST - oracleRunner.test.ts]]
- ↩️ Referenciada por: [[02-test-execution]]
<!-- brain:auto:end -->
