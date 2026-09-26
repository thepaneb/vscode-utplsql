---
id: ENT-001
aliases: [ENT-001]
tipo: entidade
titulo: "Run"
dominio: execucao
status: ativo
verificado: 2026-09-23
implementacao: []
testes: []
regras: ["BR-EXEC-001"]
relacionado: ["[[02-test-execution]]"]
tags: ["execucao"]
---
## Definição

Uma execução de testes: conjunto de itens, resultados, cobertura, duração e estado.

## Atributos

Conexão/perfil, paths/tags, cobertura on/off, timeout, token de cancelamento,
resultMap, lastFailedItems.

## Onde aparece

`runner.ts`, `oracleRunner.ts`, `results.ts`.

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - Dominio]]
- 📐 Regras: [[BR-EXEC-001 - Execução usa duas conexões dedicadas (conn1 runner, conn2 poll)|BR-EXEC-001]]
- 🔗 [[02-test-execution]]
<!-- brain:auto:end -->
