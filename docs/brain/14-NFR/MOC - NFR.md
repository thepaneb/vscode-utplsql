---
tipo: moc
status: ativo
tags: [moc, nfr, requisitos-nao-funcionais]
---

# MOC - Requisitos Não-Funcionais

Restrições de qualidade (`NFR-*`): compatibilidade, desempenho, confiabilidade,
i18n e cobertura. Distintos das regras de negócio (`BR-*`).

## Todos

```dataview
TABLE dominio, status
FROM "14-NFR"
WHERE tipo = "nfr"
SORT id ASC
```
