---
tipo: moc
status: ativo
tags: [moc, componentes, terceiros]
---

# MOC - Componentes de Terceiros

Análise **curada** (`TPL-*`) de bibliotecas/plataformas externas das quais o
projeto depende: papel, licença, criticidade, risco, alternativas e plano de
upgrade. Fatos como versão/licença vêm de `package.json` (`brain:sync`).

## Como criar

Nova nota em `17-Componentes/` com nome `TPL-<NOME>.md` (template `componente`).

## Todos os componentes

```dataview
TABLE fornecedor, licenca, criticidade, risco
FROM "17-Componentes"
WHERE tipo = "componente-terceiro"
SORT id ASC
```
