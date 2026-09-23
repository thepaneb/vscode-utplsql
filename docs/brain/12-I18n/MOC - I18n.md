---
tipo: moc
status: ativo
tags: [moc, i18n, locale]
---

# MOC - I18n

Locales da extensão (`LOC-*`, **geradas** de `package.nls.*.json` por
`npm run brain:sync`). As strings de UI ficam em `package.nls.<locale>.json` na
raiz; o README tem variantes em `60-README/` e a wiki é pt-BR/en.

## Locales

```dataview
TABLE codigo, strings, nls
FROM "12-I18n"
WHERE tipo = "locale"
SORT id ASC
```

## Relacionado

- [[MOC - Documentacao]]
- [[NFR-006 - Internacionalização]]
