---
tipo: nota
status: ativo
modulo: prds
data: 2026-10-09
verificado: 2026-10-09
tags: [prd, roadmap, planejamento]
---

# Roadmap — 0.22.0 (planejamento)

Plano da **0.22.0 — “Localização (RTL, novos locales e pipeline)”**. O status e a
versão alvo são a **fonte da verdade** no frontmatter das notas `prd-*`: ver
[[MOC - PRDs]] e [docs/prd/index.md](../../../docs/prd/index.md).

## Escopo

| Ordem | PRD | Título | Esforço | Complexidade |
|---|---|---|---|---|
| 1 | PRD-92 | RTL e novos locales (árabe e hebraico) | 2–3 dias | Média |
| 2 | PRD-93 | Pipeline de localização contínua (glossário, TM e revisão) | 2–3 dias | Média |

**PRDs:** [[prd-92-rtl-new-locales|PRD-92]] ·
[[prd-93-continuous-localization-pipeline|PRD-93]]

**Tema:** alcance e sustentação da localização (fecha o bloco de i18n iniciado na
0.21.0). Ordem sugerida: **92 → 93**.

## Fluxo de execução (por PRD)

1. `status: approved → in-progress` no frontmatter → `npm run brain:sync && npm run brain:build` + `npm run sync-prds`.
2. Implementar com TDD; manter cobertura ≥ thresholds do `.c8rc`.
3. Ao concluir: `status: completed` + `versao: "0.22.0"`; criar as regras
   `BR-*`/`SEC-*` e rodar `npm run brain:rules`; entry no `CHANGELOG.md`.
4. `npm run brain:ci` + `npm run docs:check` antes de cada PR.

## Relacionado

- [[MOC - PRDs]]
- [[Roadmap - 0.21.0 (planejamento)]]
