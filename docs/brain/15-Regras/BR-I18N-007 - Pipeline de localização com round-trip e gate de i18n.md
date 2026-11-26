---
id: BR-I18N-007
aliases: [BR-I18N-007]
tipo: regra
titulo: Pipeline de localização com round-trip e gate de i18n
dominio: i18n
status: ativo
severidade: media
fonte: codigo
verificado: 2026-11-25
implementacao: ["scripts/i18n-locale-meta.cjs", "scripts/i18n-export.cjs", "scripts/i18n-apply.cjs", "scripts/i18n-check.cjs", "package.json", ".github/workflows/ci.yml"]
testes: ["src/test/unit/i18nPipeline.test.ts"]
prds: ["PRD-93"]
requisitos: ["PRD-93/RF1", "PRD-93/RF4"]
tags: ["i18n", "tooling"]
---
## Enunciado

`i18n:export` gera um JSON por locale (`{ locale, base?, messages }`) a partir
dos catálogos compilados; `i18n:apply` regenera o arquivo inteiro de
`src/i18n/locales/<locale>.ts` (com `...en` para o overlay en-gb) e roda o Biome;
o round-trip é idempotente e preservado no CI. `i18n:check` valida catálogos ×
`LOCALE_CODES` × manifests × glossário; o glossário e o registro de locais são
as fontes de vocabulário e de donos/revisores.

## Pré-condições

`npm run compile` antes do export/check (o script npm já compila no export); o
glossário fica em `12-I18n/Glossário de localização.md`.

## Exceções

TMS externo é opcional e não entra nesta release; o `en-gb` é um overlay
(`base: "en"`) e não um catálogo completo no export.

## Justificativa

Reduz o custo de manter 26 catálogos e evita corrupção/formatação divergente na
volta do tradutor; o gate impede catálogo/manifesto/glossário fora de sincronia.

## Conexões

- 🗺️ [[MOC - Regras]]
- 🗺️ [[MOC - I18n]]
- 📄 PRDs: [[prd-93-continuous-localization-pipeline|PRD-93]]
- 🎯 Requisitos: [[prd-93-continuous-localization-pipeline|PRD-93 RF1]] ·
  [[prd-93-continuous-localization-pipeline|PRD-93 RF4]]
