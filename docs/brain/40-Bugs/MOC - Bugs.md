---
tipo: moc
status: ativo
verificado: 2026-09-23
tags: [moc, bugs, debug]
---

# MOC - Bugs

Diário de diagnóstico. Reaproveitável pelo skill `diagnosing-bugs` / `systematic-debugging`.
Use o template `bug`.

## Estrutura de uma nota de bug

1. **Sintoma** — o que se observa, como reproduzir.
2. **Hipóteses** — o que pode ser.
3. **Evidência** — logs, queries, stack frames.
4. **Causa raiz** — o que era de fato.
5. **Fix / PR** — commit ou PR associado.

## Bugs abertos

```dataview
TABLE status, modulo, severidade, file.mtime AS "Atualizado"
FROM "40-Bugs"
WHERE tipo = "bug" AND status != "resolvido"
SORT severidade ASC, file.mtime DESC
```

## Resolvidos recentemente

```dataview
LIST FROM "40-Bugs"
WHERE tipo = "bug" AND status = "resolvido"
SORT file.mtime DESC
LIMIT 10
```
