---
id: PAT-002
tipo: padrao
titulo: "Orquestrador com handlers agrupados por área"
dominio: arquitetural
categoria: arquitetural
status: ativo
verificado: 2026-09-23
implementacao: []
testes: []
regras: []
tags: ["arquitetural"]
---
## Intenção

Manter `extension.ts` como orquestrador enxuto, delegando comandos a handlers
agrupados por área em `src/commands/`.

## Como se aplica

`activate` registra providers e comandos; a lógica de cada comando vive em
`commands/{run,script,connection,profile,debug,utility,deps}`.

## Consequências

- **Positivas:** evita o "arquivo-deus"; PRD-02 consolidou a refatoração.
- **Negativas:** mais arquivos; requer mapear onde cada comando mora.

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - Padroes]]
<!-- brain:auto:end -->
