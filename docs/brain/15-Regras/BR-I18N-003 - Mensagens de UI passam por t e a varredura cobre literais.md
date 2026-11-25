---
id: BR-I18N-003
aliases: [BR-I18N-003]
tipo: regra
titulo: Mensagens de UI passam por t e a varredura cobre literais
dominio: i18n
status: ativo
severidade: media
fonte: codigo
verificado: 2026-11-25
implementacao: ["src/i18n.ts:12", "src/i18n.ts:48", "src/i18n.ts:73", "src/i18n.ts:83", "src/i18n.ts:167", "scripts/scrape-strings.cjs", "scripts/scrape-strings.allow.json"]
testes: ["src/test/unit/i18nPseudo.test.ts", "src/test/unit/scrapeStrings.test.ts"]
prds: ["PRD-89"]
requisitos: ["PRD-89/RF1", "PRD-89/RF3"]
tags: ["i18n", "qualidade"]
---
## Enunciado

Mensagens de UI novas são resolvidas por `t()`; a varredura
`scripts/scrape-strings.cjs` reporta literais de `showInformationMessage`/
`showWarningMessage`/`showErrorMessage` fora de `t()` e o pseudo-locale
(`UTPLSQL_PSEUDO_LOC=1`) revela strings não externalizadas e overflow de layout.
O scanner é **aviso** no CI (`--strict` opt-in) e usa a allowlist versionada
`scripts/scrape-strings.allow.json`.

## Pré-condições

`t()` recebe o locale resolvido; o pseudo-locale não aparece na setting pública
e só é ativado por env de desenvolvimento.

## Exceções

Literais técnicos/não-UI e exceções revisadas ficam na allowlist; mensagens de
log/Output não são alvo da varredura.

## Justificativa

Sem o gate, uma string nova escrita direto no código nunca entra em catálogo
algum e fica em inglês em todos os locales.

## Conexões

- 🗺️ [[MOC - Regras]]
- 🗺️ [[MOC - I18n]]
- 📄 PRDs: [[prd-89-pseudo-localization-gate|PRD-89]]
- 🎯 Requisitos: [[prd-89-pseudo-localization-gate|PRD-89 RF1]] ·
  [[prd-89-pseudo-localization-gate|PRD-89 RF3]]
