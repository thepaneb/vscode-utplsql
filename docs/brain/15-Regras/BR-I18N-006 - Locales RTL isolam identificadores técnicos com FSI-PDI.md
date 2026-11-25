---
id: BR-I18N-006
aliases: [BR-I18N-006]
tipo: regra
titulo: Locales RTL isolam identificadores técnicos com FSI/PDI
dominio: i18n
status: ativo
severidade: media
fonte: codigo
verificado: 2026-11-25
implementacao: ["src/i18n.ts:149", "src/i18n.ts:150", "src/i18n.ts:184"]
testes: ["src/test/unit/i18n.test.ts"]
prds: ["PRD-92"]
requisitos: ["PRD-92/RF1", "PRD-92/RF4"]
tags: ["i18n", "rtl"]
---
## Enunciado

Em locales RTL (`ar`, `he`), `t()` envolve os parâmetros técnicos (`name`,
`path`, `file`, `schema`, `conn`, `id`, `cmd`, `package`, `proc`, `desc`,
`reporter`, `error`, `version`, `user`, `dir`, `label`, `profile`, `charset`) em
FSI/PDI (`U+2068`/`U+2069`). Prosa traduzida e números de contagem não são
isolados; identificadores PL/SQL, paths e códigos Oracle permanecem LTR.

## Pré-condições

Locale resolvido para `ar`/`he`; o catálogo pode estar em draft/beta.

## Exceções

Locales LTR não recebem marcadores. Texto técnico que não venha por parâmetro
(ex.: corpo fixo de uma mensagem) não é isolado.

## Justificativa

Sem o isolamento, um identificador como `UT3.PKG` pode ser reordenado
visualmente dentro de uma frase RTL.

## Conexões

- 🗺️ [[MOC - Regras]]
- 🗺️ [[MOC - I18n]]
- 📄 PRDs: [[prd-92-rtl-new-locales|PRD-92]]
- 🎯 Requisitos: [[prd-92-rtl-new-locales|PRD-92 RF1]] ·
  [[prd-92-rtl-new-locales|PRD-92 RF4]]
