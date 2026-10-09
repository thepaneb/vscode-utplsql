---
tipo: nota
status: ativo
modulo: prds
data: 2026-10-09
verificado: 2026-10-09
tags: [prd, roadmap, planejamento]
---

# Roadmap — 0.16.0 (planejamento)

Plano da **0.16.0 — “Modernização do runtime (ESM/ES2023)”**. O status e a versão
alvo são a **fonte da verdade** no frontmatter das notas `prd-*`: ver
[[MOC - PRDs]] e [docs/prd/index.md](../../../docs/prd/index.md).

## Escopo

| Ordem | PRD | Título | Esforço | Complexidade |
|---|---|---|---|---|
| 1 | PRD-95 | Modernização do runtime: ESM, ES2023 e stdlib Node 22 | 2–3 dias | Média |
| 2 | PRD-98 | Anti-drift de documentação: tabelas geradas e vínculo PRD→docs | 3–5 dias | Média-Alta |
| 3 | PRD-99 | Cérebro reutilizável: guia de uso e reuso do knowledge base | 1–2 dias | Baixa-Média |
| 4 | PRD-97 | Documentação no site (Fase 2 da PRD-96) | 2–3 dias | Média |

**PRDs:** [[prd-95-esm-es2023-node22|PRD-95]] ·
[[prd-98-docs-anti-drift|PRD-98]] · [[prd-99-brain-reuse|PRD-99]] ·
[[prd-97-doc-no-site|PRD-97]]

**Tema:** runtime e documentação. Nenhuma feature de UX/execução — a 0.16.0 é
majoritariamente infraestrutura e governança de docs. Ordem sugerida: **PRD-95**
(base do runtime) → docs (**98 → 99 → 97**).

## Fluxo de execução (por PRD)

1. `status: approved → in-progress` no frontmatter → `npm run brain:sync && npm run brain:build` + `npm run sync-prds`.
2. Implementar com TDD; manter cobertura ≥ thresholds do `.c8rc`.
3. Ao concluir: `status: completed` + `versao: "0.16.0"`; criar as regras
   `BR-*`/`SEC-*` (`prds:`/`implementacao:`/`testes:`) e rodar `npm run brain:rules`;
   entry no `CHANGELOG.md`.
4. `npm run brain:ci` + `npm run docs:check` antes de cada PR.

## Relacionado

- [[MOC - PRDs]]
- [[Roadmap - 0.15.0 (execução)]] · [[Roadmap - 0.17.0 (planejamento)]]
