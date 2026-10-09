---
tipo: nota
status: ativo
modulo: prds
data: 2026-10-09
verificado: 2026-10-09
tags: [prd, roadmap, planejamento]
---

# Roadmap — 0.19.0 (planejamento)

Plano da **0.19.0 — “Observabilidade e desempenho”**. O status e a versão alvo são
a **fonte da verdade** no frontmatter das notas `prd-*`: ver [[MOC - PRDs]] e
[docs/prd/index.md](../../../docs/prd/index.md).

## Escopo

| Ordem | PRD | Título | Esforço | Complexidade |
|---|---|---|---|---|
| 1 | PRD-107 | Fixture de integração endurecido: usuário sem privilégios e fallbacks | 1–2 dias | Média |
| 2 | PRD-101 | Ciclo de vida de conexões: fechar pools ociosos após a execução | 1–2 d | Média |
| 3 | PRD-102 | Observabilidade: tracing e instrumentação de desempenho | 2–3 d | Média |
| 4 | PRD-103 | Reindexação incremental de fontes (watcher por-URI) | 2–3 d | Média |
| 5 | PRD-106 | Harness de performance: fixture em escala e medição por fases | 2–3 dias | Média-Alta |

**PRDs:** [[prd-107-unprivileged-fixture|PRD-107]] ·
[[prd-101-connection-pool-lifecycle|PRD-101]] ·
[[prd-102-trace-and-perf-instrumentation|PRD-102]] ·
[[prd-103-incremental-source-reindex|PRD-103]] ·
[[prd-106-perf-harness|PRD-106]]

**Dependências internas (decidem a ordem):**
- **PRD-107 → PRD-101**: a fixture com usuário sem privilégios habilita as
  asserções de ciclo de sessão do pool — por isso 107 vem **antes** de 101.
- **PRD-102 → PRD-106**: o harness de perf reusa a instrumentação da 102.

Ordem sugerida: **107 → 101 → 102 → 103 → 106**.

## Fluxo de execução (por PRD)

1. `status: approved → in-progress` no frontmatter → `npm run brain:sync && npm run brain:build` + `npm run sync-prds`.
2. Implementar com TDD; manter cobertura ≥ thresholds do `.c8rc`.
3. Ao concluir: `status: completed` + `versao: "0.19.0"`; criar as regras
   `BR-*`/`SEC-*` e rodar `npm run brain:rules`; entry no `CHANGELOG.md`.
4. `npm run brain:ci` + `npm run docs:check` antes de cada PR.

## Relacionado

- [[MOC - PRDs]]
- [[Roadmap - 0.18.0 (planejamento)]] · [[Roadmap - 0.20.0 (planejamento)]]
- Upstream de referência (não oficial): `paddi35/utplsql-for-vscode`
