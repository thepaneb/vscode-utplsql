---
id: NFR-008
aliases: [NFR-008]
tipo: nfr
titulo: "Multi-root workspace"
dominio: compatibilidade
status: ativo
verificado: 2026-09-23
implementacao: []
testes: []
regras: []
relacionado: ["[[MOC - Arquitetura]]", "[[PAT-001 - Módulos puros vs dependentes de vscode]]"]
requisitos: ["PRD-06/RF5"]
tags: ["compatibilidade"]
---
## Requisito

Resolver `root`/`sourcePath` por workspace folder; descoberta e cobertura corretas
em múltiplas raízes.

## Justificativa

Monorepos e workspaces com vários projetos Oracle.

## Verificação

`config.ts`, PRD-57, testes de multi-root.

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - NFR]]
- 🎯 Requisitos: [[prd-06-multiroot|PRD-06 RF5]]
- 🔗 [[MOC - Arquitetura]] · [[PAT-001 - Módulos puros vs dependentes de vscode]]
<!-- brain:auto:end -->
