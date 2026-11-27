---
id: BR-I18N-002
aliases: [BR-I18N-002]
tipo: regra
titulo: Números e durações exibidos respeitam o locale
dominio: i18n
status: ativo
severidade: media
fonte: codigo
verificado: 2026-11-25
implementacao: ["src/i18n.ts:71", "src/i18n.ts:91", "src/i18n.ts:101", "src/statusBar.ts:23", "src/state.ts:40"]
testes: ["src/test/unit/i18n.test.ts", "src/test/unit/statusBar.test.ts", "src/test/unit/state.test.ts"]
prds: ["PRD-88"]
requisitos: ["PRD-88/RF1", "PRD-88/RF2", "PRD-88/RF3"]
tags: ["i18n", "ui"]
---
## Enunciado

Números e durações de apresentação usam `formatNumber`/`formatDuration` (sobre
`Intl.*`) com o locale resolvido; `t()` formata os parâmetros de contagem
(`count`, `total`, `current`) e a status bar/label do Test Explorer exibem
`12,3 s` em pt-BR e `12.3 s` em en. Formatos de máquina (ISO, XML, PL/SQL,
mensagens do Oracle) não são localizados.

## Pré-condições

Locale resolvido por `resolveLocale`; `formatNumber` valida o locale contra
`LOCALE_CODES` e cai para `en` (depois `String`) quando necessário.

## Exceções

Parâmetros técnicos (`line`, `ms`, `index`, identificadores) permanecem crus.
Durações abaixo de 1 s usam `ms` (`850 ms`).

## Justificativa

Evita separador decimal errado em 17 locales e mantém contagens/prosa legíveis
sem localizar dados técnicos.

## Conexões

- 🗺️ [[MOC - Regras]]
- 🗺️ [[MOC - I18n]]
- 📄 PRDs: [[prd-88-locale-aware-formatting|PRD-88]]
- 🎯 Requisitos: [[prd-88-locale-aware-formatting|PRD-88 RF1]] ·
  [[prd-88-locale-aware-formatting|PRD-88 RF2]] ·
  [[prd-88-locale-aware-formatting|PRD-88 RF3]]
