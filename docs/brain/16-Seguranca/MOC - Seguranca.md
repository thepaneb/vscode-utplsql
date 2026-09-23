---
tipo: moc
status: ativo
tags: [moc, seguranca, sec]
---

# MOC - Segurança

Invariantes de segurança e tratamento de segredos (`SEC-*`). Cada nota deriva de
regras `BR-*` e aponta o controle no código. Foco: o que **não pode** acontecer
(vazar senha, injetar SQL, sair do workspace, escalar privilégio).

## Todas

```dataview
TABLE dominio, severidade, status
FROM "16-Seguranca"
WHERE tipo = "seguranca"
SORT id ASC
```
