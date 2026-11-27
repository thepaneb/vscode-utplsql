---
id: BR-I18N-008
aliases: [BR-I18N-008]
tipo: regra
titulo: Catálogos de locale em um arquivo por locale com barrel canônico
dominio: i18n
status: ativo
severidade: baixa
fonte: codigo
verificado: 2026-11-25
implementacao: ["src/i18n/locales/index.ts:30", "src/i18n/locales/index.ts:57", "src/i18n/locales/index.ts:59", "src/i18n.ts:5"]
testes: ["src/test/unit/i18n.test.ts"]
prds: ["PRD-115"]
requisitos: ["PRD-115/RF1", "PRD-115/RF2"]
tags: ["i18n", "arquitetura"]
---
## Enunciado

Cada locale tem um arquivo próprio em `src/i18n/locales/<locale>.ts`; o barrel
`src/i18n/locales/index.ts` exporta os catálogos, a lista canônica `LOCALE_CODES`
e o mapa `catalogs`. `src/i18n.ts` deriva `ExtensionLocale`/`catalogs` do barrel e
não mantém uma segunda lista de locales.

## Pré-condições

Catálogo base em pt-BR; `en-gb` é um overlay de `en` (`{ ...en, … }`) e os demais
catálogos têm todas as chaves da base.

## Exceções

Nenhuma; um novo locale exige um arquivo, a entrada em `LOCALE_CODES` e o
manifesto `package.nls.<locale>.json`.

## Justificativa

Um arquivo por locale reduz conflitos de merge, facilita a navegação e mantém a
ordem/derivação do registry em um único lugar.

## Conexões

- 🗺️ [[MOC - Regras]]
- 🗺️ [[MOC - I18n]]
- 📄 PRDs: [[prd-115-split-i18n-locales|PRD-115]]
