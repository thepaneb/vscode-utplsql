---
tipo: nota
status: ativo
modulo: prds
data: 2026-10-09
verificado: 2026-10-30
tags: [prd, roadmap, planejamento]
---

# Roadmap — 0.21.0 (planejamento)

Plano da **0.21.0 — “Arquitetura, configuração e resiliência”**. O status e a versão
alvo são a **fonte da verdade** no frontmatter das notas `prd-*`: ver [[MOC - PRDs]] e
[docs/prd/index.md](../../../docs/prd/index.md).

## Escopo

| Ordem | PRD | Título | Esforço | Complexidade |
|---|---|---|---|---|
| 1 | PRD-129 | Orquestrador de execução com Strategy | 2–3 dias | Média-Alta |
| 2 | PRD-128 | Event bus interno e desacoplamento de callbacks de execução | 1–2 dias | Média |
| 3 | PRD-130 | Validação de configuração e classes de erro tipadas | 1–2 dias | Média |
| 4 | PRD-131 | Resiliência na descoberta: retry, cache e limpeza de Memento | 1–2 dias | Média |
| 5 | PRD-137 | Vincular senha da wallet ao connection do perfil | 0,5–1 dia | Baixa |
| 6 | PRD-138 | Padrão Strategy para organização da árvore de testes | 1–2 dias | Média |
| 7 | PRD-139 | Fatiamento do TestStateManager e LRU no coverageStore | 1–2 dias | Média |

**PRDs:** [[prd-129-orchestration-strategy|PRD-129]] ·
[[prd-128-event-bus-internal|PRD-128]] ·
[[prd-130-config-validation-typed-errors|PRD-130]] ·
[[prd-131-discovery-resilience-cache|PRD-131]] ·
[[prd-137-wallet-password-binding|PRD-137]] ·
[[prd-138-organization-strategy-pattern|PRD-138]] ·
[[prd-139-state-store-slicing-lru|PRD-139]]

**Tema:** refatorações estruturais que destravam as releases seguintes. A ordem
**129 → 128** separa a orquestração (estratégias de run) do barramento de eventos
que expõe os efeitos colaterais; a 130 tipa a configuração e os erros antes de a
131 mexer em descoberta/cache. A 137 fecha a pendência da PRD-81 (wallet) sobre o
modelo de conexão estabilizado na 0.20.0; a 138 e a 139 fatiam a árvore e o estado
antes da UX da 0.24.0.

**Reorganização (2026-10-30, nivelamento):** as PRDs **128/129/130/131/137/138/139**
estavam marcadas como 0.20.0, mas nunca entraram no escopo daquela release (que
segue com 6 PRDs de observabilidade/desempenho). Elas formam esta release de
arquitetura, entre a instrumentação da 0.20.0 e a localização da 0.22.0. A antiga
0.21.0 (bloco de i18n) foi fundida na 0.22.0.

**Total estimado:** ≈ 7,5–14 dias.

## Fluxo de execução (por PRD)

1. `status: approved → in-progress` no frontmatter → `npm run brain:sync && npm run brain:build` + `npm run sync-prds`.
2. Implementar com TDD; manter cobertura ≥ thresholds do `.c8rc`.
3. Ao concluir: `status: completed` + `versao: "0.21.0"`; criar as regras
   `BR-*`/`SEC-*` e rodar `npm run brain:rules`; entry no `CHANGELOG.md`.
4. `npm run brain:ci` + `npm run docs:check` antes de cada PR.

## Relacionado

- [[MOC - PRDs]]
- [[Roadmap - 0.20.0 (planejamento)]] · [[Roadmap - 0.22.0 (planejamento)]]
