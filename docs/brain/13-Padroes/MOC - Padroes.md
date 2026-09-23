---
tipo: moc
status: ativo
verificado: 2026-09-23
tags: [moc, padroes]
---

# MOC - Padrões (design e sistema)

Padrões **curados** (`PAT-*`): como o projeto resolve classes de problemas e onde
isso aparece no código. Ligam-se às regras (`BR-*`) que governam e às decisões
(`ADR-*`) que as originaram.

## Como criar

Nova nota em `13-Padroes/` com nome `PAT-NNN - <nome>.md` (template `padrao`).

## Todos os padrões

```dataview
TABLE categoria, status, file.mtime AS "Atualizado"
FROM "13-Padroes"
WHERE tipo = "padrao"
SORT id ASC
```

## Índice (links)

<!-- brain:auto:start:moc-index -->
- [[PAT-001 - Módulos puros vs dependentes de vscode]] — `PAT-001`
- [[PAT-002 - Orquestrador com handlers agrupados por área]] — `PAT-002`
- [[PAT-003 - Funções canônicas compartilhadas de resultado]] — `PAT-003`
- [[PAT-004 - Streaming por poll incremental de buffer]] — `PAT-004`
- [[PAT-005 - Degradação graciosa (best-effort)]] — `PAT-005`
- [[PAT-006 - Options object para execuções longas]] — `PAT-006`
- [[PAT-007 - Stub de vscode em duas camadas]] — `PAT-007`
<!-- brain:auto:end -->
