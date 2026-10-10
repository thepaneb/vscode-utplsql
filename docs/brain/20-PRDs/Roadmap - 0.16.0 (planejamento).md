---
tipo: nota
status: ativo
modulo: prds
data: 2026-10-10
verificado: 2026-10-10
tags: [prd, roadmap, planejamento]
---

# Roadmap — 0.16.0 (planejamento)

Plano da **0.16.0 — “Produtividade e resultados”**. O status e a versão alvo são a
**fonte da verdade** no frontmatter das notas `prd-*`: ver [[MOC - PRDs]] e
[docs/prd/index.md](../../../docs/prd/index.md).

## Escopo

| Ordem | PRD | Título | Esforço | Complexidade |
|---|---|---|---|---|
| 1 | PRD-59 | Scaffold de suíte de teste (esqueleto) | 1–2 dias | Média |
| 2 | PRD-100 | Geração de suíte a partir do package (scaffold avançado) | 2–3 dias | Média-Alta |
| 3 | PRD-56 | Duração por teste e persistência de resultados | 1 dia | Baixa-Média |
| 4 | PRD-57 | Multi-root: resolução de `root`/`sourcePath` por folder | 1–2 dias | Média |
| 5 | PRD-58 | Run Related Tests | 1 dia | Média |

**PRDs:** [[prd-59-scaffold-suite|PRD-59]] ·
[[prd-100-generate-test-suite|PRD-100]] · [[prd-56-duration-persistence|PRD-56]] ·
[[prd-57-multiroot-root-resolution|PRD-57]] · [[prd-58-run-related-tests|PRD-58]]

**Tema:** produtividade do dia a dia — geração de suíte, resultados persistentes e
execução relacionada. Ordem sugerida: **PRD-59 → PRD-100** (a 100 estende a 59);
depois **56 → 57 → 58**.

**Reorganização (2026-10-10):** esta versão passa a abrir o roadmap de features
por ser a de **maior ganho visível ao usuário**; era a antiga 0.17.0. Todo o
bloco de runtime/docs foi movido para o fim (ver [[Roadmap - 0.23.0 (planejamento)]]).

**Total estimado:** ≈ 6–9 dias.

## Fluxo de execução (por PRD)

1. `status: approved → in-progress` no frontmatter → `npm run brain:sync && npm run brain:build` + `npm run sync-prds`.
2. Implementar com TDD; manter cobertura ≥ thresholds do `.c8rc`
   (97% lines/statements, 97% functions, 93% branches).
3. Ao concluir: `status: completed` + `versao: "0.16.0"`; criar as regras
   `BR-*`/`SEC-*` (`prds:`/`implementacao:`/`testes:`) e rodar `npm run brain:rules`;
   entry no `CHANGELOG.md`.
4. `npm run brain:ci` + `npm run docs:check` antes de cada PR.

## Relacionado

- [[MOC - PRDs]]
- [[Roadmap - 0.15.0 (execução)]] · [[Roadmap - 0.17.0 (planejamento)]]
