---
id: NFR-007
tipo: nfr
titulo: "Cobertura de testes TypeScript"
dominio: qualidade
status: ativo
verificado: 2026-09-23
implementacao: []
testes: []
regras: []
tags: ["qualidade"]
---
## Requisito

Thresholds de cobertura (c8): 90% lines/statements, 85% branches, 90% functions.

## Justificativa

Proteger refatorações dos módulos puros e canônicos.

## Verificação

`.c8rc`, `npm run test:coverage`.
