---
id: GLOSS-005
aliases: [GLOSS-005]
tipo: glossario
titulo: "Coverage owner"
dominio: cobertura
status: ativo
verificado: 2026-09-23
implementacao: []
testes: []
regras: ["BR-COB-003"]
relacionado: ["[[ENT-004 - Coverage]]", "[[04-code-coverage]]"]
tags: ["cobertura"]
---
## Definição

Schema cujos objetos são medidos pela cobertura (parâmetro do utPLSQL). Diferente
do schema de conexão; configurável por perfil (`coverageOwner`).

## Onde aparece

`config.ts`, `coverage.ts`, `plsqlDeclarations.ts`.

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - Glossario]]
- 📐 Regras: [[BR-COB-003 - Cobertura de views via V$SQL é opt-in e best-effort|BR-COB-003]]
- 🔗 [[ENT-004 - Coverage]] · [[04-code-coverage]]
<!-- brain:auto:end -->
