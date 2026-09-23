---
id: BR-EXEC-002
tipo: regra
titulo: Conexões do runner têm callTimeout zerado
dominio: execucao
status: ativo
severidade: alta
fonte: codigo
verificado: 2026-09-23
implementacao: ["src/oracleRunner.ts:154", "src/oracleRunner.ts:155"]
testes: ["src/test/unit/oracleRunner.test.ts:522"]
tags: ["execucao"]
---
## Enunciado

Se as duas conexões vêm do pool, então callTimeout é forçado a 0 em conn1 e conn2, para que um timeout herdado do pool não aborte a execução longa.

## Pré-condições

Conexões obtidas via pool.getConnection() em acquireRunnerConnections.

## Exceções

No caminho raw (oracledb.getConnection) o callTimeout não é explicitamente zerado.

## Justificativa

O runner pode rodar por minutos; um callTimeout herdado derrubaria o run antes do fim.

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - Regras]]
<!-- brain:auto:end -->
