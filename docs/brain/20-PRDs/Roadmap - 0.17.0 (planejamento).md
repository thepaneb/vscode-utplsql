---
tipo: nota
status: ativo
modulo: prds
data: 2026-10-09
verificado: 2026-10-09
tags: [prd, roadmap, planejamento]
---

# Roadmap — 0.17.0 (planejamento)

Plano da **0.17.0 — “Persistência, multi-root e produtividade”**. O status e a
versão alvo são a **fonte da verdade** no frontmatter das notas `prd-*`: ver
[[MOC - PRDs]] e [docs/prd/index.md](../../../docs/prd/index.md).

## Escopo

| Ordem | PRD | Título | Esforço | Complexidade |
|---|---|---|---|---|
| 1 | PRD-56 | Duração por teste e persistência de resultados | 2–3 d | Média |
| 2 | PRD-57 | Multi-root / resolução de raiz | 1–2 d | Média |
| 3 | PRD-58 | Run Related Tests | 1–2 d | Média |
| 4 | PRD-59 | Scaffold de suíte de teste (esqueleto) | 1–2 d | Média |
| 5 | **PRD-100** | **Geração de suíte a partir do package (scaffold avançado)** | **2–3 d** | **Média-Alta** |

**PRDs:** [[prd-56-duration-persistence|PRD-56]] ·
[[prd-57-multiroot-root-resolution|PRD-57]] · [[prd-58-run-related-tests|PRD-58]] ·
[[prd-59-scaffold-suite|PRD-59]] · [[prd-100-generate-test-suite|PRD-100]]

**Novidade desta versão (do estudo com `paddi35/utplsql-for-vscode`):**
a **PRD-100** (porta do `generateTest`/`utplsql.generate.*`) estende o scaffold
da PRD-59. Ordem sugerida: **PRD-59 → PRD-100**. Os itens de UX (PRD-105
snippets, PRD-108 coverage HTML, PRD-109 linguagem) foram movidos para a
**0.22.0** para não sobrecarregar esta versão.

## Fluxo de execução (por PRD)

1. `status: approved → in-progress` no frontmatter → `npm run brain:sync && npm run brain:build` + `npm run sync-prds`.
2. Implementar com TDD; manter cobertura ≥ thresholds do `.c8rc`.
3. Ao concluir: `status: completed` + `versao: "0.17.0"`; criar as regras
   `BR-*`/`SEC-*` (`prds:`/`implementacao:`/`testes:`) e rodar `npm run brain:rules`;
   entry no `CHANGELOG.md`.
4. `npm run brain:ci` + `npm run docs:check` antes de cada PR.

## Relacionado

- [[MOC - PRDs]]
- [[Roadmap - 0.16.0 (planejamento)]]
- [[Roadmap - 0.18.0 (planejamento)]]
