---
tipo: nota
status: concluida
modulo: prds
data: 2026-10-02
verificado: 2026-10-08
concluida: 2026-10-08
tags: [prd, roadmap, planejamento]
---

# Roadmap — 0.15.0 (execução)

Plano de execução da **0.15.0 — “Tags e UX de execução”**. O status e a versão
alvo são a **fonte da verdade** no frontmatter das notas `prd-*`: ver
[[MOC - PRDs]] e [docs/prd/index.md](../../../docs/prd/index.md).

## Escopo aprovado

| Ordem | PRD | Título | Esforço | Complexidade |
|---|---|---|---|---|
| 1 | PRD-52 | Diff inline esperado × obtido nas falhas | 0,5–1 d | Baixa |
| 2 | PRD-53 | Debug de testes: variações (cursor, falhos, último) | 0,5–1 d | Baixa |
| 3 | PRD-54 | Toggle de cobertura na status bar | 0,5–1 d | Baixa-Média |
| 4 | PRD-51 | Execução e seleção por Tag (`%tags`) | 1–2 d | Média |
| 5 | PRD-50 | Auto-run on Save (Watch Mode) | 1–2 d | Média |
| 6 | PRD-55 | Organização da árvore de testes por tag | 1–2 d | Média |

**PRDs:** [[prd-52-inline-diff-expected-actual|PRD-52]] ·
[[prd-53-debug-test-variants|PRD-53]] · [[prd-54-coverage-toggle|PRD-54]] ·
[[prd-51-run-by-tag|PRD-51]] · [[prd-50-auto-run-on-save|PRD-50]] ·
[[prd-55-tag-organization|PRD-55]]

**Total estimado:** ≈ **4,5–9 dias**. Tema central: tags + UX de execução.

## Sequência sugerida

1. **Rápidos primeiro** (validação cedo): **PRD-52** → **PRD-53** → **PRD-54**.
2. **Tags** (tema central): **PRD-51** → **PRD-55**.
3. **Watch mode**: **PRD-50** por último (depende de hooks de save/workspace).

## Reorganização do roadmap (decidida 2026-10-10)

Value-first + dependências: features visíveis primeiro, enablers antes do código
que eles habilitam, runtime/docs por último. Detalhe em cada nota `Roadmap - *`.

| Release | Tema | PRDs |
|---|---|---|
| **0.15.0** | Tags e UX de execução | 50, 51, 52, 53, 54, 55 |
| 0.16.0 | Produtividade e resultados | 56–59, 100 |
| 0.17.0 | UX de editor e cobertura | 105, 108, 109 |
| 0.18.0 | Fundação: segurança, testes e anti-drift | 98, 104, 110, 113, 114 |
| 0.19.0 | Refatoração de fundo | 111, 115 |
| 0.20.0 | Observabilidade e desempenho | 101–103, 106, 107 |
| 0.21.0 | Localização (formatação, plurais e paridade) | 88–91 |
| 0.22.0 | Localização (RTL, novos locales e pipeline) | 92–93 |
| 0.23.0 | Runtime, docs e qualidade residual | 95, 97, 99, 112, 116, 117 |
| **A definir** | Toolchain (Node 26, **pós-LTS ~out/2026**; liberação prevista 2026-10-28) | 47 |

## Fluxo de execução (por PRD)

1. `status: approved → in-progress` no frontmatter → `npm run brain:build` + `npm run sync-prds`.
2. Implementar com TDD; manter cobertura ≥ thresholds do `.c8rc` (badge no Codecov).
3. Ao concluir: `status: completed` + `versao: "0.15.0"`; criar/alterar as regras
   `BR-*`/`SEC-*` que a PRD materializa (`prds:`/`implementacao:`/`testes:`) e rodar
   `npm run brain:rules`; entry no `CHANGELOG.md`.
4. `npm run brain:ci` + `npm run docs:check` antes de cada PR.

## Definição de pronto (release)

- 7 PRDs concluídos com `versao: "0.15.0"` (50, 51, 52, 53, 54, 55 e 96) e
  vínculo bidirecional PRD ↔ regra.
- `package.json` = `0.15.0` + seção `## 0.15.0` no `CHANGELOG.md`.
- Integração + matriz Oracle (thin/thick) verdes; cobertura publicada no Codecov.
- Publicação via **GitHub release** → `publish.yml` (skill `release`) → post do LinkedIn.

## Status — concluída (0.15.0)

Release **0.15.0 “Tags e UX de execução”** publicada. Os **7 PRDs** do escopo
(50, 51, 52, 53, 54, 55 e 96) estão `completed` com `versao: "0.15.0"`;
`package.json` = `0.15.0` e `CHANGELOG.md` com a seção `## 0.15.0`.
Integração + matriz Oracle (thin/thick) verdes; publicação via **GitHub
release** (`publish.yml`) e post de release. Roadmap **encerrado** — o próximo
tema é **0.16.0** (PRD-95/PRD-97).

## Relacionado

- [[MOC - PRDs]]
- [[prd-47-node-26-toolchain|PRD-47]] (A definir) · [[prd-95-esm-es2023-node22|PRD-95]] (0.16.0)
