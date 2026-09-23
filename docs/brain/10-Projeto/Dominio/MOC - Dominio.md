---
tipo: moc
status: ativo
tags: [moc, dominio, entidades]
---

# MOC - Modelo de Domínio

Entidades centrais (`ENT-*`) e suas relações. As regras (`BR-*`) e o glossário
(`GLOSS-*`) referenciam estas entidades.

## Todas

```dataview
TABLE dominio
FROM "10-Projeto/Dominio"
WHERE tipo = "entidade"
SORT id ASC
```
