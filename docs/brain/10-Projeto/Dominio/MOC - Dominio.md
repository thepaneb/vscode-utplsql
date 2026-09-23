---
tipo: moc
status: ativo
verificado: 2026-09-23
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

## Índice (links)

<!-- brain:auto:start:moc-index -->
- [[ENT-001 - Run]] — `ENT-001`
- [[ENT-002 - Suite]] — `ENT-002`
- [[ENT-003 - TestCase]] — `ENT-003`
- [[ENT-004 - Coverage]] — `ENT-004`
- [[ENT-005 - ConnectionProfile]] — `ENT-005`
- [[ENT-006 - OutputBuffer]] — `ENT-006`
<!-- brain:auto:end -->
