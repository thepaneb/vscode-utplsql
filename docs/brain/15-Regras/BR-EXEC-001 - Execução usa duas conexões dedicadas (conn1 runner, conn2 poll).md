---
id: BR-EXEC-001
tipo: regra
titulo: Execução usa duas conexões dedicadas (conn1 runner, conn2 poll)
dominio: execucao
status: ativo
severidade: critica
fonte: codigo
verificado: 2026-09-23
implementacao: ["src/oracleRunner.ts:137", "src/oracleRunner.ts:141", "src/oracleRunner.ts:513"]
testes: ["src/test/unit/oracleRunner.test.ts:485", "src/test/unit/oracleRunner.test.ts:502"]
tags: ["execucao"]
---
## Enunciado

Se uma execução Oracle inicia, então são adquiridas exatamente duas conexões: conn1 executa ut_runner.run (chamada bloqueante) enquanto conn2 consulta o buffer de saída em paralelo.

## Pré-condições

oracledb disponível e connection string válida; chamado por executeRunOracle.

## Exceções

Preferência por pool (ensurePool); se o pool não puder ser criado, cai para oracledb.getConnection (raw) duas vezes.

## Justificativa

O ut_runner.run bloqueia a sessão até o fim dos testes; uma segunda sessão é necessária para ler o buffer em tempo real sem esperar o término.

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - Regras]]
<!-- brain:auto:end -->
