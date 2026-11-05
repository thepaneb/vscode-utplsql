---
tipo: nota
status: ativo
modulo: prds
data: 2026-10-10
verificado: 2026-11-05
tags: [prd, roadmap, planejamento]
---

# Roadmap — 0.20.0 (planejamento)

Plano da **0.20.0 — “Observabilidade e desempenho”**. O status e a versão alvo são
a **fonte da verdade** no frontmatter das notas `prd-*`: ver [[MOC - PRDs]] e
[docs/prd/index.md](../../../docs/prd/index.md).

## Escopo

| Ordem | PRD | Título | Esforço | Complexidade |
|---|---|---|---|---|
| 1 | PRD-120 | Ativação enxuta e validação de setup preguiçosa | 1–2 dias | Média |
| 2 | PRD-107 | Fixture de integração endurecido: usuário sem privilégios e fallbacks | 1–2 dias | Média |
| 3 | PRD-101 | Ciclo de vida de conexões: fechar pools ociosos após a execução | 1–2 dias | Média |
| 4 | PRD-111 | Agrupar `OracleRunOptions` (RF2 residual da 0.19.0) | 1–2 dias | Média |
| 5 | PRD-102 | Observabilidade: tracing e instrumentação de desempenho | 2–3 dias | Média |
| 6 | PRD-103 | Reindexação incremental de fontes (watcher por-URI) | 2–3 dias | Média |
| 7 | PRD-106 | Harness de performance: fixture em escala e medição por fases | 2–3 dias | Média-Alta |
| 8 | PRD-125 | Suíte completa em thick e matriz de bancos no CI (RF3 residual) | 1–2 dias | Média-Alta |
| 9 | PRD-146 | Attestations de proveniência na publicação (verificação) | 0,5 dia | Baixa |
| 10 | PRD-147 | Marketplace: superfície dedicada, screenshots e metadata de conversão | 2–3 dias | Média |

**PRDs:** [[prd-120-lean-activation-lazy-setup|PRD-120]] ·
[[prd-107-unprivileged-fixture|PRD-107]] ·
[[prd-101-connection-pool-lifecycle|PRD-101]] ·
[[prd-111-decompose-oracle-runner|PRD-111]] ·
[[prd-102-trace-and-perf-instrumentation|PRD-102]] ·
[[prd-103-incremental-source-reindex|PRD-103]] · [[prd-106-perf-harness|PRD-106]] ·
[[prd-125-thick-full-matrix-ci|PRD-125]] ·
[[prd-146-attestations-publish|PRD-146]] ·
[[prd-147-marketplace-listing-page|PRD-147]]

**Tema:** confiabilidade e desempenho (ativação, ciclo de conexões, reindexação,
tracing e medição de fases), com os resíduos de plataforma da 0.19.0 e as
pendências de proveniência/marketplace. Ordem sugerida: **120 → 107 → 101 → 111
→ 102 → 103 → 106 → 125 → 146 → 147** (a 120 remove o `onStartupFinished` e a
conexão na ativação — achado “Broad Activation” do VSCan; a 107 habilita os
testes da 101; o RF2 da 111 vem antes da instrumentação da 102 para não refazer
o formato das opções; a 106 mede as fases instrumentadas pela 102; o RF3 da 125
aproveita a estabilidade de conexão da 101/102; a 146 só fecha na publicação; a
147 é independente e fica por último).

**Reorganização (2026-10-10):** era a antiga 0.19.0; agora vem **após a PRD-111**
(0.19.0) para que a instrumentação da 102 incida sobre o `oracleRunner` já
decomposto.

**Complemento (2026-10-13):** a **PRD-120** (ativação enxuta + validação de setup
preguiçosa) entra aqui por tocar o ciclo de vida de conexão da PRD-101 e se
beneficiar do harness de desempenho da PRD-106 para medir a ativação.

**Reorganização (2026-11-05, pós-0.19.0):** a 0.19.0 foi publicada em
2026-11-04. Entram como resíduos o **RF2 da PRD-111** e o **RF3 da PRD-125**
(ambos já previstos no fechamento da versão anterior), a **verificação da
PRD-146** (implementada no `main` depois da tag `v0.19.0`) e a **PRD-147**
(versão declarada 0.20.0). Com isso a **0.25.0 deixa de existir**: a PRD-146 era
a única PRD atribuída a ela.

**Total estimado:** ≈ 13,5–22,5 dias.

## Fluxo de execução (por PRD)

1. `status: approved → in-progress` no frontmatter → `npm run brain:sync && npm run brain:build` + `npm run sync-prds`.
2. Implementar com TDD; manter cobertura ≥ thresholds do `.c8rc`.
3. Ao concluir: `status: completed` + `versao: "0.20.0"`; criar as regras
   `BR-*`/`SEC-*` e rodar `npm run brain:rules`; entry no `CHANGELOG.md`.
4. `npm run brain:ci` + `npm run docs:check` antes de cada PR.

## Relacionado

- [[MOC - PRDs]]
- [[Roadmap - 0.19.0 (planejamento)]] · [[Roadmap - 0.21.0 (planejamento)]]
