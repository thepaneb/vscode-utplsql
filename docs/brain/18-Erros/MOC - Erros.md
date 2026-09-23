---
tipo: moc
status: ativo
tags: [moc, erros, err]
---

# MOC - Catálogo de Erros

Erros conhecidos (`ERR-*`): código (`ORA-*`, `NJS-*`, `DPI-*`, `UTPLSQL_*`),
sintoma, causa e correção. Serve de base para o Troubleshooting do README e para
mensagens amigáveis/quick-fixes.

## Todos

```dataview
TABLE codigo, dominio, severidade, status
FROM "18-Erros"
WHERE tipo = "erro"
SORT codigo ASC
```
