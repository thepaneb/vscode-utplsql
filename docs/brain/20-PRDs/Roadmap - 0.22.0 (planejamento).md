---
tipo: nota
status: ativo
modulo: prds
data: 2026-10-09
verificado: 2026-10-30
tags: [prd, roadmap, planejamento]
---

# Roadmap — 0.22.0 (planejamento)

Plano da **0.22.0 — “Localização completa”**. O status e a versão alvo são a
**fonte da verdade** no frontmatter das notas `prd-*`: ver [[MOC - PRDs]] e
[docs/prd/index.md](../../../docs/prd/index.md).

## Escopo

| Ordem | PRD | Título | Esforço | Complexidade |
|---|---|---|---|---|
| 1 | PRD-115 | Fatiar `i18nLocales.ts` por locale | 1–2 dias | Média |
| 2 | PRD-88 | Formatação sensível a locale (números e durações) | 0,5–1 dia | Baixa |
| 3 | PRD-90 | Plurais (CLDR) e seleção no catálogo de mensagens | 2–3 dias | Média-Alta |
| 4 | PRD-89 | Pseudo-localização e gate de strings não traduzidas | 1 dia | Baixa-Média |
| 5 | PRD-91 | Paridade de documentação e distribuição localizada | 1–2 dias | Média |
| 6 | PRD-92 | RTL e novos locales (árabe e hebraico) | 2–3 dias | Média |
| 7 | PRD-93 | Pipeline de localização contínua (glossário, TM e revisão) | 2–3 dias | Média |

**PRDs:** [[prd-115-split-i18n-locales|PRD-115]] ·
[[prd-88-locale-aware-formatting|PRD-88]] ·
[[prd-90-message-plurals-cldr|PRD-90]] ·
[[prd-89-pseudo-localization-gate|PRD-89]] ·
[[prd-91-doc-parity-localized-distribution|PRD-91]] ·
[[prd-92-rtl-new-locales|PRD-92]] ·
[[prd-93-continuous-localization-pipeline|PRD-93]]

**Tema:** o bloco de localização inteiro numa release. A **115** abre, fatiando os
catálogos para reduzir conflito; a **88** e a **90** cuidam de formatação e
plurais; a **89** fecha a rede de segurança de strings; a **91** alinha docs e
distribuição; a **92** adiciona RTL/novos locales e a **93** sustenta o pipeline.
Ordem sugerida: **115 → 88 → 90 → 89 → 91 → 92 → 93**.

**Reorganização (2026-10-30, nivelamento):** as antigas 0.21.0 (“formatação,
plurais e paridade”) e 0.22.0 (“RTL, novos locales e pipeline”) foram fundidas
aqui para nivelar a carga. A **PRD-115** veio da 0.19.0 e continua **antes** das
features 88–93, como o plano original exigia.

**Total estimado:** ≈ 9,5–15 dias.

## Fluxo de execução (por PRD)

1. `status: approved → in-progress` no frontmatter → `npm run brain:sync && npm run brain:build` + `npm run sync-prds`.
2. Implementar com TDD; manter cobertura ≥ thresholds do `.c8rc`.
3. Ao concluir: `status: completed` + `versao: "0.22.0"`; criar as regras
   `BR-*`/`SEC-*` e rodar `npm run brain:rules`; entry no `CHANGELOG.md`.
4. `npm run brain:ci` + `npm run docs:check` antes de cada PR.

## Relacionado

- [[MOC - PRDs]]
- [[Roadmap - 0.21.0 (planejamento)]] · [[Roadmap - 0.23.0 (planejamento)]]
