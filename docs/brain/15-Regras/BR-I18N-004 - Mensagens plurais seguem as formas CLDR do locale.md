---
id: BR-I18N-004
aliases: [BR-I18N-004]
tipo: regra
titulo: Mensagens plurais seguem as formas CLDR do locale
dominio: i18n
status: ativo
severidade: media
fonte: codigo
verificado: 2026-11-25
implementacao: ["src/i18n.ts:164", "src/i18n.ts:170", "src/i18n/locales/types.ts", "scripts/i18n-check.cjs:16"]
testes: ["src/test/unit/i18n.test.ts"]
prds: ["PRD-90"]
requisitos: ["PRD-90/RF1", "PRD-90/RF2", "PRD-90/RF3"]
tags: ["i18n", "qualidade"]
---
## Enunciado

Uma mensagem de contagem pode ser escalar (`string`) ou um objeto de formas
plurais (`one`/`few`/`many`/`two`/`zero`/`other`). `t()` seleciona a forma com
`Intl.PluralRules(locale).select(count)` usando o `count` bruto e faz fallback
`other` → pt-BR → chave. Cada locale define as categorias que o CLDR pode
retornar; o `i18n:check` e o teste de paridade cobram todas elas (e `other`).

## Pré-condições

Catálogo base em pt-BR; o `count` é numérico e também é formatado pelo locale
(PRD-88) na interpolação.

## Exceções

Chaves sem contagem continuam escalares. Traduções draft das formas são
aceitas até a revisão in-country registrada no local.

## Justificativa

O truque `(s)` não cobre idiomas com 3–6 formas e quebra a concordância em
contagens singulares.

## Conexões

- 🗺️ [[MOC - Regras]]
- 🗺️ [[MOC - I18n]]
- 📄 PRDs: [[prd-90-message-plurals-cldr|PRD-90]]
- 🧠 ADR: [[ADR-014 - Catálogo próprio com plurais CLDR|ADR-014]]
- 🎯 Requisitos: [[prd-90-message-plurals-cldr|PRD-90 RF1]] ·
  [[prd-90-message-plurals-cldr|PRD-90 RF2]] ·
  [[prd-90-message-plurals-cldr|PRD-90 RF3]]
