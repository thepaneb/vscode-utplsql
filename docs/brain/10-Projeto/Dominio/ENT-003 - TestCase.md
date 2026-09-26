---
id: ENT-003
aliases: [ENT-003]
tipo: entidade
titulo: "TestCase"
dominio: descoberta
status: ativo
verificado: 2026-09-23
implementacao: []
testes: []
regras: []
relacionado: ["[[GLOSS-002 - Teste (procedure de teste)]]", "[[01-test-discovery]]"]
tags: ["descoberta"]
---
## Definição

Procedure de teste; unidade de resultado, cobertura e jump-to-failure.

## Atributos

procName, description, line, tags, disabled, expectedError, resultado/status.

## Onde aparece

`types.ts`, `suiteParser.ts`, `matching.ts`, `results.ts`.

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - Dominio]]
- 🔗 [[GLOSS-002 - Teste (procedure de teste)]] · [[01-test-discovery]]
- ↩️ Referenciada por: [[GLOSS-002 - Teste (procedure de teste)|GLOSS-002]]
<!-- brain:auto:end -->
