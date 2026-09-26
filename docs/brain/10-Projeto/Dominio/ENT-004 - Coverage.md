---
id: ENT-004
aliases: [ENT-004]
tipo: entidade
titulo: "Coverage"
dominio: cobertura
status: ativo
verificado: 2026-09-23
implementacao: []
testes: []
regras: []
relacionado: ["[[GLOSS-005 - Coverage owner]]", "[[04-code-coverage]]"]
tags: ["cobertura"]
---
## Definição

Métrica de cobertura por arquivo/linha/declaração (Cobertura) e por view (V$SQL).

## Atributos

filename, line-rate, branch, declarations; executed (views).

## Onde aparece

`cobertura.ts`, `coverage.ts`, `plsqlDeclarations.ts`, `viewCoverage.ts`.

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - Dominio]]
- 🔗 [[GLOSS-005 - Coverage owner]] · [[04-code-coverage]]
- ↩️ Referenciada por: [[GLOSS-005 - Coverage owner|GLOSS-005]]
<!-- brain:auto:end -->
