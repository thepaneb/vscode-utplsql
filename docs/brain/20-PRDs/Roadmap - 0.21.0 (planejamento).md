---
tipo: nota
status: ativo
modulo: prds
data: 2026-10-09
verificado: 2026-11-07
tags: [prd, roadmap, planejamento]
---

# Roadmap — 0.21.0 (planejamento)

Plano da **0.21.0 — “Arquitetura, configuração e resiliência”**. O status e a versão
alvo são a **fonte da verdade** no frontmatter das notas `prd-*`: ver [[MOC - PRDs]] e
[docs/prd/index.md](../../../docs/prd/index.md).

## Escopo

| Ordem | PRD | Título | Esforço | Complexidade |
|---|---|---|---|---|
| 1 | PRD-130 | Validação de configuração e classes de erro tipadas | 1–2 dias | Média |
| 2 | PRD-129 | Orquestrador de execução com Strategy | 2–3 dias | Média-Alta |
| 3 | PRD-128 | Event bus interno e desacoplamento de callbacks de execução | 1–2 dias | Média |
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
**130 → 129 → 128** coloca a configuração/erros tipados como fundação, depois
separa a orquestração (estratégias de run) do barramento de eventos que expõe os
efeitos colaterais; a 131 mexe em descoberta/cache só depois. A 137 fecha a
pendência da PRD-81 (wallet) sobre o modelo de conexão estabilizado na 0.20.0 e
pode andar em paralelo; a 138 e a 139 fatiam a árvore e o estado antes da UX da
0.25.0.

> **Revisão (2026-11-07):** a ordem original era 129 → 128 → 130. A 130
> (config/erros tipados) é fundacional e passou para primeiro; a 137 (wallet) é
> independente e pode ser paralela. O WIP recomendado é 2–3 PRDs simultâneas
> para não transformar a release de arquitetura em uma pilha de refatorações.

**Reorganização (2026-10-30, nivelamento):** as PRDs **128/129/130/131/137/138/139**
estavam marcadas como 0.20.0, mas nunca entraram no escopo daquela release (que
segue com 6 PRDs de observabilidade/desempenho). Elas formam esta release de
arquitetura, entre a instrumentação da 0.20.0 e a localização da 0.22.0. A antiga
0.21.0 (bloco de i18n) foi fundida na 0.22.0.

**Dependência:** a PRD-148 (0.20.1) fecha a serialização de runs e os IDs com
schema antes das refatorações 129/131/138/139.

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
