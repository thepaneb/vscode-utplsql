---
id: ENT-001
tipo: entidade
titulo: "Run"
dominio: execucao
status: ativo
verificado: 2026-09-23
implementacao: []
testes: []
regras: []
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
<!-- brain:auto:end -->
