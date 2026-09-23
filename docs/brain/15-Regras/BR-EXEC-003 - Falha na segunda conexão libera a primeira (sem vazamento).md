---
id: BR-EXEC-003
tipo: regra
titulo: Falha na segunda conexão libera a primeira (sem vazamento)
dominio: execucao
status: ativo
severidade: alta
fonte: codigo
verificado: 2026-09-23
implementacao: ["src/oracleRunner.ts:149", "src/oracleRunner.ts:151", "src/oracleRunner.ts:163", "src/oracleRunner.ts:165"]
testes: ["src/test/unit/oracleRunner.test.ts:537", "src/test/unit/oracleRunner.test.ts:569"]
tags: ["execucao"]
---
## Enunciado

Se a obtenção de conn2 falha, então conn1 é fechada antes de repropagar o erro, tanto no caminho de pool quanto no raw.

## Pré-condições

acquireRunnerConnections obteve conn1 com sucesso e falhou ao obter conn2.

## Exceções

Nenhuma; o erro original é sempre repropagado.

## Justificativa

Sem o close, a conexão do pool fica presa até expirar, esgotando o pool em execuções repetidas.

