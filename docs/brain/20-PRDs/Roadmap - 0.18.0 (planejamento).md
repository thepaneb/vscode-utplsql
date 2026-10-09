---
tipo: nota
status: ativo
modulo: prds
data: 2026-10-09
verificado: 2026-10-09
tags: [prd, roadmap, planejamento]
---

# Roadmap — 0.18.0 (planejamento)

Plano da **0.18.0 — “UX de editor e cobertura”**. O status e a versão alvo são a
**fonte da verdade** no frontmatter das notas `prd-*`: ver [[MOC - PRDs]] e
[docs/prd/index.md](../../../docs/prd/index.md).

## Escopo

| Ordem | PRD | Título | Esforço | Complexidade |
|---|---|---|---|---|
| 1 | PRD-109 | Identidade de linguagem PL/SQL ampliada e `languageIds` | 1 dia | Baixa |
| 2 | PRD-105 | Snippets utPLSQL: biblioteca de annotations e matchers | 1 dia | Baixa |
| 3 | PRD-108 | Relatório HTML de cobertura aberto no navegador | 1 dia | Baixa |

**PRDs:** [[prd-109-language-identity|PRD-109]] ·
[[prd-105-snippets|PRD-105]] · [[prd-108-coverage-html-report|PRD-108]]

**Tema:** polimento barato e de alto valor. Vêm do estudo comparativo com
`paddi35/utplsql-for-vscode` e foram **antecipados** para antes da localização
(prioridade valor-primeiro). Ordem sugerida: **109 → 105 → 108** — o ID/registro
de linguagem (109) antes dos snippets (105) evita re-registrar snippets se a
linguagem for ampliada/renomeada.

## Fluxo de execução (por PRD)

1. `status: approved → in-progress` no frontmatter → `npm run brain:sync && npm run brain:build` + `npm run sync-prds`.
2. Implementar com TDD; manter cobertura ≥ thresholds do `.c8rc`.
3. Ao concluir: `status: completed` + `versao: "0.18.0"`; criar as regras
   `BR-*`/`SEC-*` e rodar `npm run brain:rules`; entry no `CHANGELOG.md`.
4. `npm run brain:ci` + `npm run docs:check` antes de cada PR.

## Relacionado

- [[MOC - PRDs]]
- [[Roadmap - 0.17.0 (planejamento)]] · [[Roadmap - 0.19.0 (planejamento)]]
- Upstream de referência (não oficial): `paddi35/utplsql-for-vscode`
