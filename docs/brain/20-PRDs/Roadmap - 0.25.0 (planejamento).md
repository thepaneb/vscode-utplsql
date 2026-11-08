---
tipo: nota
status: ativo
modulo: prds
data: 2026-11-07
verificado: 2026-11-07
tags: [prd, roadmap, planejamento]
---

# Roadmap — 0.25.0 (planejamento)

Plano da **0.25.0 — “UX, onboarding e descoberta”**. O status e a versão alvo são
a **fonte da verdade** no frontmatter das notas `prd-*`: ver [[MOC - PRDs]] e
[docs/prd/index.md](../../../docs/prd/index.md).

> **Reorganização (2026-11-07):** a 0.25.0 volta a existir para acomodar a onda
> de UX que estava misturada na 0.24.0 (segurança/distribuição). A 0.24.0 tinha
> 10 PRDs e ≈9,5–16,5 dias; separar UX de segurança reduz o risco de as duas
> frentes travarem uma à outra.

## Escopo

| Ordem | PRD | Título | Esforço | Complexidade |
|---|---|---|---|---|
| 1 | PRD-133 | Rate limiting e granularidade de atalhos | 0,5–1 dia | Baixa |
| 2 | PRD-132 | UX de execução: dry-run, perfil ativo e jump-to-failure | 1,5–2,5 dias | Média |
| 3 | PRD-151 | CodeLens de debug de teste e suíte | 1–2 dias | Baixa-Média |
| 4 | PRD-140 | Indicador de conexão/perfil no status bar e agrupamento de settings | 1 dia | Baixa |
| 5 | PRD-141 | Walkthrough de onboarding e auditoria de acessibilidade | 1–2 dias | Baixa-Média |

**PRDs:** [[prd-133-rate-limiting-keybindings|PRD-133]] ·
[[prd-132-ux-execution-dryrun-jump|PRD-132]] ·
[[prd-151-codelens-debug-test|PRD-151]] ·
[[prd-140-statusbar-settings-grouping|PRD-140]] ·
[[prd-141-onboarding-walkthrough-accessibility|PRD-141]]

**Tema:** valor visível ao usuário depois que a arquitetura (0.21.0), o estado
(0.22.0) e a segurança/distribuição (0.24.0) estabilizaram. A **133** e a **132**
fecham a UX de execução; a **151** leva o debug para o CodeLens, ao lado de
executar/executar com cobertura; a **140** e a **141** cuidam de status bar,
settings, onboarding e acessibilidade.

**Ordem sugerida:** **133 → 132 → 151 → 140 → 141**. A 151 é independente das
demais e pode andar em paralelo; a 141 depende da 140; a 132 e a 140 vêm depois
da 129/128 (orquestração e event bus, 0.21.0).

**Revisão da PRD-132 (2026-11-07):** o RF4 (filtro `UT_*`) foi parcialmente
antecipado na 0.20.0; o esforço caiu de 2–3 para 1,5–2,5 dias e o restante
(expansão de formatos de stack) continua nesta versão.

**Total estimado:** ≈ 5–8,5 dias.

## Fluxo de execução (por PRD)

1. `status: approved → in-progress` no frontmatter → `npm run brain:sync && npm run brain:build` + `npm run sync-prds`.
2. Implementar com TDD; manter cobertura ≥ thresholds do `.c8rc`.
3. Ao concluir: `status: completed` + `versao: "0.25.0"`; criar as regras
   `BR-*`/`SEC-*` e rodar `npm run brain:rules`; entry no `CHANGELOG.md`.
4. `npm run brain:ci` + `npm run docs:check` antes de cada PR.

## Relacionado

- [[MOC - PRDs]]
- [[Roadmap - 0.24.0 (planejamento)]] · [[Roadmap - 0.23.0 (planejamento)]]
