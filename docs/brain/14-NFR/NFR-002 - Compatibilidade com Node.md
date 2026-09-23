---
id: NFR-002
tipo: nfr
titulo: "Compatibilidade com Node"
dominio: compatibilidade
status: ativo
verificado: 2026-09-23
implementacao: []
testes: []
regras: []
tags: ["compatibilidade"]
---
## Requisito

`engines.node >= 22`; `.nvmrc` 24; CI testa 22 e 24.

## Justificativa

Alinhar toolchain local e CI (PRD-18/47).

## Verificação

`package.json`, `.nvmrc`, workflows.
