---
id: BR-EXEC-002
aliases: [BR-EXEC-002]
tipo: regra
titulo: Conexões do runner têm callTimeout zerado
dominio: execucao
status: ativo
severidade: alta
fonte: codigo
verificado: 2026-09-23
implementacao: ["src/oracleRunner.ts:154", "src/oracleRunner.ts:155"]
testes: ["src/test/unit/oracleRunner.test.ts:522"]
prds: ["PRD-38"]
requisitos: ["PRD-38/RF3"]
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
- 📄 PRDs: [[prd-38-connection-pooling|PRD-38]]
- 🎯 Requisitos: [[prd-38-connection-pooling|PRD-38 RF3]]
- 🧩 Código: [[COD - oracleRunner.ts]]
- 🧪 Testes: [[TST - oracleRunner.test.ts]]
- ↩️ Referenciada por: [[02-test-execution]]
<!-- brain:auto:end -->
