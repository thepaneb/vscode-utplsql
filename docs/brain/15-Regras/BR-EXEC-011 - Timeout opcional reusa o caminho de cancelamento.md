---
id: BR-EXEC-011
tipo: regra
titulo: Timeout opcional reusa o caminho de cancelamento
dominio: execucao
status: ativo
severidade: alta
fonte: codigo
verificado: 2026-09-23
implementacao: ["src/oracleRunner.ts:716", "src/oracleRunner.ts:717", "src/oracleRunner.ts:719", "src/oracleRunner.ts:720", "src/oracleRunner.ts:723"]
testes: ["src/test/unit/oracleRunner.test.ts:1524"]
tags: ["execucao"]
---
## Enunciado

Se timeoutMinutes > 0, então um timer de timeoutMinutes * 60000 ms chama cancelRun() + wakeRun(); se timeoutMinutes é 0/ausente, nenhum timer é criado e a execução pode durar indefinidamente.

## Pré-condições

Opção timeoutMinutes recebida (default 0).

## Exceções

O timer é sempre limpo no finally; o timeout encerra sem lançar erro (resultados parciais ainda são aplicados).

## Justificativa

Evita run pendurado sem depender de cancelamento manual, reaproveitando a mesma mecânica de break das duas conexões.

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - Regras]]
<!-- brain:auto:end -->
