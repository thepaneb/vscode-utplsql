---
tipo: moc
status: ativo
verificado: 2026-09-23
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

## Índice (links)

<!-- brain:auto:start:moc-index -->
- [[LOC-bg - Български]] — `LOC-bg`
- [[LOC-cs - Čeština]] — `LOC-cs`
- [[LOC-de - Deutsch]] — `LOC-de`
- [[LOC-el - Ελληνικά]] — `LOC-el`
- [[LOC-en - English]] — `LOC-en`
- [[LOC-en-gb - English (UK)]] — `LOC-en-gb`
- [[LOC-es - Español]] — `LOC-es`
- [[LOC-fr - Français]] — `LOC-fr`
- [[LOC-hu - Magyar]] — `LOC-hu`
- [[LOC-id - Bahasa Indonesia]] — `LOC-id`
- [[LOC-it - Italiano]] — `LOC-it`
- [[LOC-ja - 日本語]] — `LOC-ja`
- [[LOC-ko - 한국어]] — `LOC-ko`
- [[LOC-pl - Polski]] — `LOC-pl`
- [[LOC-pt-br - Português (Brasil)]] — `LOC-pt-br`
- [[LOC-ro - Română]] — `LOC-ro`
- [[LOC-ru - Русский]] — `LOC-ru`
- [[LOC-sr - Српски]] — `LOC-sr`
- [[LOC-th - ไทย]] — `LOC-th`
- [[LOC-tr - Türkçe]] — `LOC-tr`
- [[LOC-uk - Українська]] — `LOC-uk`
- [[LOC-vi - Tiếng Việt]] — `LOC-vi`
- [[LOC-zh-cn - 中文(简体)]] — `LOC-zh-cn`
- [[LOC-zh-tw - 中文(繁體)]] — `LOC-zh-tw`
<!-- brain:auto:end -->
