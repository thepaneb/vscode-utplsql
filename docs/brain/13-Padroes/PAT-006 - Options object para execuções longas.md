---
id: PAT-006
aliases: [PAT-006]
tipo: padrao
titulo: "Options object para execuções longas"
dominio: design
categoria: design
status: ativo
verificado: 2026-09-23
implementacao: []
testes: []
regras: []
relacionado: ["[[ADR-005 - Funcoes canonicas de resultado e matching por nome]]", "[[02-test-execution]]"]
tags: ["design"]
---
## Intenção

Evitar assinaturas com muitos parâmetros posicionais em operações complexas.

## Como se aplica

`executeRunOracle` recebe um objeto de opções (PRD-40): conexão, paths, tags,
cobertura, random seed, timeout, token de cancelamento.

## Consequências

- **Positivas:** legibilidade e evolução sem quebrar chamadas.
- **Negativas:** campos opcionais exigem defaults cuidadosos.

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - Padroes]]
- 🔗 [[ADR-005 - Funcoes canonicas de resultado e matching por nome]] · [[02-test-execution]]
<!-- brain:auto:end -->
