---
tipo: moc
status: ativo
tags: [moc, regras, br]
---

# MOC - Regras de Negócio

Uma nota por **regra atômica** (`BR-*`): uma afirmação verificável ("se X, então
Y"), com ID estável. A fonte primária é o **código** (`fonte: codigo`); PRDs
entram como contexto.

## Como criar

Nova nota em `15-Regras/` no formato `BR-<DOMINIO>-<NNN> - <título>.md`
(template `regra`). Domínios: `conexao`, `execucao`, `descoberta`, `parser`,
`resultados`, `ui`, `cobertura`, `diagnostico`, `schema`, `i18n`.

## Todas as regras

```dataview
TABLE dominio, severidade, status, fonte, file.mtime AS "Atualizado"
FROM "15-Regras"
WHERE tipo = "regra"
SORT id ASC
```

## Quantidade por domínio

```dataview
TABLE length(rows) AS "Qtd"
FROM "15-Regras"
WHERE tipo = "regra"
GROUP BY dominio
SORT dominio ASC
```

## Regras sem teste (lacuna)

```dataview
TABLE id, dominio, implementacao
FROM "15-Regras"
WHERE tipo = "regra" AND status = "ativo" AND (!testes OR length(testes) = 0)
SORT id ASC
```
