---
tipo: nota
status: ativo
modulo: prds
data: 2026-10-10
verificado: 2026-10-10
tags: [prd, roadmap, planejamento]
---

# Roadmap — 0.19.0 (planejamento)

Plano da **0.19.0 — “Refatoração de fundo”**. O status e a versão alvo são a
**fonte da verdade** no frontmatter das notas `prd-*`: ver [[MOC - PRDs]] e
[docs/prd/index.md](../../../docs/prd/index.md).

## Escopo

| Ordem | PRD | Título | Esforço | Complexidade |
|---|---|---|---|---|
| 1 | PRD-111 | Decompor `executeRunOracle` e agrupar `OracleRunOptions` | 2–3 dias | Média-Alta |
| 2 | PRD-115 | Fatiar `i18nLocales.ts` por locale | 1–2 dias | Média |

**PRDs:** [[prd-111-decompose-oracle-runner|PRD-111]] ·
[[prd-115-split-i18n-locales|PRD-115]]

**Tema:** refatorações que **reduzem o retrabalho** das features seguintes. A
PRD-111 decompõe `executeRunOracle` **antes** da instrumentação da PRD-102
(observabilidade), e a PRD-115 fatia os catálogos i18n **antes** das features de
localização (0.21/0.22).

**Reorganização (2026-10-10):** nova versão de churn-reduction. A ordem
`111 → 102` e `115 → i18n` corrige duas inversões do plano anterior.

**Total estimado:** ≈ 3–5 dias.

## Fluxo de execução (por PRD)

1. `status: approved → in-progress` no frontmatter → `npm run brain:sync && npm run brain:build` + `npm run sync-prds`.
2. Implementar com TDD; manter cobertura ≥ thresholds do `.c8rc`; **nenhuma
   mudança de comportamento observável**.
3. Ao concluir: `status: completed` + `versao: "0.19.0"`; criar as regras
   `BR-*`/`SEC-*` e rodar `npm run brain:rules`; entry no `CHANGELOG.md`.
4. `npm run brain:ci` + `npm run docs:check` antes de cada PR.

## Relacionado

- [[MOC - PRDs]]
- [[Roadmap - 0.18.0 (planejamento)]] · [[Roadmap - 0.20.0 (planejamento)]]
