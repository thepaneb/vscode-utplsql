---
tipo: moc
status: ativo
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
