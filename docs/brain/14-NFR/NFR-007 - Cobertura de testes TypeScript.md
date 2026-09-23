---
id: NFR-007
aliases: [NFR-007]
tipo: nfr
titulo: "Cobertura de testes TypeScript"
dominio: qualidade
status: ativo
verificado: 2026-09-23
implementacao: []
testes: []
regras: []
relacionado: ["[[ADR-006 - Modulos puros vs dependentes de vscode]]", "[[TPL-C8 - c8 (cobertura TypeScript)]]", "[[PAT-007 - Stub de vscode em duas camadas]]", "[[MOC - Testes]]"]
requisitos: ["PRD-37/RF1"]
tags: ["qualidade"]
---
## Requisito

Thresholds de cobertura (c8): 90% lines/statements, 85% branches, 90% functions.

## Justificativa

Proteger refatorações dos módulos puros e canônicos.

## Verificação

`.c8rc`, `npm run test:coverage`.

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - NFR]]
- 🎯 Requisitos: [[prd-37-ts-coverage|PRD-37 RF1]]
- 🔗 [[ADR-006 - Modulos puros vs dependentes de vscode]] · [[TPL-C8 - c8 (cobertura TypeScript)]] · [[PAT-007 - Stub de vscode em duas camadas]] · [[MOC - Testes]]
<!-- brain:auto:end -->
