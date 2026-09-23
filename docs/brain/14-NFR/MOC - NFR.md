---
tipo: moc
status: ativo
verificado: 2026-09-23
tags: [moc, nfr]
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

## Índice (links)

<!-- brain:auto:start:moc-index -->
- [[NFR-001 - Compatibilidade com Oracle e piso do utPLSQL]] — `NFR-001`
- [[NFR-002 - Compatibilidade com Node]] — `NFR-002`
- [[NFR-003 - Compatibilidade com VSCode]] — `NFR-003`
- [[NFR-004 - Latência do streaming]] — `NFR-004`
- [[NFR-005 - Cancelamento e timeout]] — `NFR-005`
- [[NFR-006 - Internacionalização]] — `NFR-006`
- [[NFR-007 - Cobertura de testes TypeScript]] — `NFR-007`
- [[NFR-008 - Multi-root workspace]] — `NFR-008`
<!-- brain:auto:end -->
