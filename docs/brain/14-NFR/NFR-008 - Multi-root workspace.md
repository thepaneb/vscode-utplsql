---
id: NFR-008
tipo: nfr
titulo: "Multi-root workspace"
dominio: compatibilidade
status: ativo
verificado: 2026-09-23
implementacao: []
testes: []
regras: []
tags: ["compatibilidade"]
---
## Requisito

Resolver `root`/`sourcePath` por workspace folder; descoberta e cobertura corretas
em múltiplas raízes.

## Justificativa

Monorepos e workspaces com vários projetos Oracle.

## Verificação

`config.ts`, PRD-57, testes de multi-root.
