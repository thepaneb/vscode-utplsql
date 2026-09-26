---
tipo: moc
status: ativo
verificado: 2026-09-23
tags: [moc, snippets]
---

# MOC - Snippets

Comandos, queries Oracle e receitas reutilizáveis. Use o template `snippet`.

## Índice

```dataview
LIST FROM "50-Snippets"
WHERE tipo = "snippet"
SORT file.name ASC
```

## Ideias de snippets

- Descobrir prefixo do schema utPLSQL (`ALL_SYNONYMS`).
- Ler `UT_OUTPUT_BUFFER_TMP` para um schema.
- Listar objetos inválidos (`ALL_OBJECTS WHERE status='INVALID'`).
- Rodar `ut_runner.run` manualmente.
- Empacotar .vsix e inspecionar conteúdo.
- Sync de PRDs com token (WSLENV).
