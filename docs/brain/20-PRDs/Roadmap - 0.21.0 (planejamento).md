---
tipo: nota
status: ativo
modulo: prds
data: 2026-10-09
verificado: 2026-10-09
tags: [prd, roadmap, planejamento]
---

# Roadmap — 0.21.0 (planejamento)

Plano da **0.21.0 — “Localização (formatação, plurais e paridade)”**. O status e a
versão alvo são a **fonte da verdade** no frontmatter das notas `prd-*`: ver
[[MOC - PRDs]] e [docs/prd/index.md](../../../docs/prd/index.md).

## Escopo

| Ordem | PRD | Título | Esforço | Complexidade |
|---|---|---|---|---|
| 1 | PRD-88 | Formatação sensível a locale (números e durações) | 0,5–1 dia | Baixa |
| 2 | PRD-89 | Pseudo-localização e gate de strings não traduzidas | 1 dia | Baixa-Média |
| 3 | PRD-90 | Plurais (CLDR) e seleção no catálogo de mensagens | 2–3 dias | Média-Alta |
| 4 | PRD-91 | Paridade de documentação e distribuição localizada | 1–2 dias | Média |

**PRDs:** [[prd-88-locale-aware-formatting|PRD-88]] ·
[[prd-89-pseudo-localization-gate|PRD-89]] ·
[[prd-90-message-plurals-cldr|PRD-90]] ·
[[prd-91-doc-parity-localized-distribution|PRD-91]]

**Tema:** qualidade da localização. Deslocada para depois da UX e do desempenho
por prioridade valor-primeiro (decisão de 2026-10-09). Ordem sugerida:
**88 → 90 → 89 → 91**.

## Fluxo de execução (por PRD)

1. `status: approved → in-progress` no frontmatter → `npm run brain:sync && npm run brain:build` + `npm run sync-prds`.
2. Implementar com TDD; manter cobertura ≥ thresholds do `.c8rc`.
3. Ao concluir: `status: completed` + `versao: "0.21.0"`; criar as regras
   `BR-*`/`SEC-*` e rodar `npm run brain:rules`; entry no `CHANGELOG.md`.
4. `npm run brain:ci` + `npm run docs:check` antes de cada PR.

## Relacionado

- [[MOC - PRDs]]
- [[Roadmap - 0.20.0 (planejamento)]] · [[Roadmap - 0.22.0 (planejamento)]]
