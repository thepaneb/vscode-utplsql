---
tipo: nota
status: ativo
modulo: i18n
data: 2026-11-25
verificado: 2026-11-25
implementacao: ["src/i18n/locales/index.ts", "src/i18n/locales/pt-br.ts", "src/i18n/locales/en.ts", "src/i18n/locales/en-gb.ts", "src/i18n/locales/es.ts", "src/i18n/locales/zh-cn.ts", "src/i18n/locales/zh-tw.ts", "src/i18n/locales/ja.ts", "src/i18n/locales/de.ts", "src/i18n/locales/fr.ts", "src/i18n/locales/it.ts", "src/i18n/locales/ko.ts", "src/i18n/locales/ru.ts", "src/i18n/locales/tr.ts", "src/i18n/locales/pl.ts", "src/i18n/locales/cs.ts", "src/i18n/locales/hu.ts", "src/i18n/locales/bg.ts", "src/i18n/locales/el.ts", "src/i18n/locales/id.ts", "src/i18n/locales/ro.ts", "src/i18n/locales/sr.ts", "src/i18n/locales/th.ts", "src/i18n/locales/uk.ts", "src/i18n/locales/vi.ts"]
tags: [i18n, locale]
---

# Estrutura dos catálogos

Cada locale tem um arquivo próprio em `src/i18n/locales/<locale>.ts` (PRD-115);
o barrel `src/i18n/locales/index.ts` exporta os catálogos, a lista canônica
`LOCALE_CODES` e o mapa `catalogs`. O motor em `src/i18n.ts` deriva
`ExtensionLocale`/`catalogs` desse registry e mantém o mapa de prefixos de
`resolveLocale` explícito.

- Base: **pt-BR**; chave ausente → pt-BR → a própria chave.
- Paridade de chaves: `src/test/unit/i18n.test.ts`.
- Regra: [[BR-I18N-001 - Resolução de locale e fallback de tradução|BR-I18N-001]].
- Decisão de localização: [[ADR-007 - i18n via package.nls com 23 locales|ADR-007]].

## Conexões

- 🗺️ [[MOC - I18n]]
- 📄 [[prd-115-split-i18n-locales|PRD-115]]
