---
tipo: moc
status: ativo
tags: [moc, decisoes, adr]
---

# MOC - Decisões (ADRs)

Registre **por que** decidimos, não só o quê. Use o template `adr`.

## Como criar

Nova nota em `30-Decisoes/` com nome `ADR-NNN - <título curto>.md`.

## Todas as decisões

```dataview
TABLE status, modulo, file.mtime AS "Atualizado"
FROM "30-Decisoes"
WHERE tipo = "decisao"
SORT file.name ASC
```

## Em aberto / propostas

```dataview
LIST FROM "30-Decisoes"
WHERE tipo = "decisao" AND (status = "proposta" OR status = "em discussao")
SORT file.mtime DESC
```
