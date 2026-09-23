---
id: PAT-003
aliases: [PAT-003]
tipo: padrao
titulo: "Funções canônicas compartilhadas de resultado"
dominio: design
categoria: design
status: ativo
verificado: 2026-09-23
implementacao: []
testes: []
regras: []
relacionado: ["[[ADR-005 - Funcoes canonicas de resultado e matching por nome]]", "[[03-results-and-reporting]]"]
tags: ["design"]
---
## Intenção

Concentrar o pós-processamento de uma execução em funções puras reutilizáveis,
evitando duplicação entre runners.

## Como se aplica

`results.ts` expõe `applyResultsFromCases`, `applyCoverageFromXml`, `countResults`
e `resolveStackFrameToUri`; os runners apenas chamam essas funções.

## Consequências

- **Positivas:** um só lugar para matching, cobertura e contagem (PRD-39/44).
- **Negativas:** mudanças nesses contratos afetam todos os runners.

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - Padroes]]
- 🔗 [[ADR-005 - Funcoes canonicas de resultado e matching por nome]] · [[03-results-and-reporting]]
<!-- brain:auto:end -->
