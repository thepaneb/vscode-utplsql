---
tipo: nota
status: ativo
modulo: prds
data: 2026-10-30
verificado: 2026-10-30
tags: [prd, roadmap, planejamento]
---

# Roadmap — 0.24.0 (planejamento)

Plano da **0.24.0 — “UX, segurança e distribuição”**. O status e a versão alvo são
a **fonte da verdade** no frontmatter das notas `prd-*`: ver [[MOC - PRDs]] e
[docs/prd/index.md](../../../docs/prd/index.md).

## Escopo

| Ordem | PRD | Título | Esforço | Complexidade |
|---|---|---|---|---|
| 1 | PRD-133 | Rate limiting e granularidade de atalhos | 0,5–1 dia | Baixa |
| 2 | PRD-132 | UX de execução: dry-run, perfil ativo e jump-to-failure | 2–3 dias | Média |
| 3 | PRD-140 | Indicador de conexão/perfil no status bar e agrupamento de settings | 1 dia | Baixa |
| 4 | PRD-141 | Walkthrough de onboarding e auditoria de acessibilidade | 1–2 dias | Baixa-Média |
| 5 | PRD-143 | Auditoria de ReDoS/regex e validação de entrada | 1–2 dias | Média |
| 6 | PRD-142 | Proveniência (SLSA) no release e gate de typecheck no CI | 0,5–1 dia | Baixa |
| 7 | PRD-121 | Pacote auditável: source map do bundle no VSIX | 0,5 dia | Baixa |
| 8 | PRD-122 | Confiança na distribuição: publisher verificado e política de privacidade | 1–2 dias | Baixa-Média |

**PRDs:** [[prd-133-rate-limiting-keybindings|PRD-133]] ·
[[prd-132-ux-execution-dryrun-jump|PRD-132]] ·
[[prd-140-statusbar-settings-grouping|PRD-140]] ·
[[prd-141-onboarding-walkthrough-accessibility|PRD-141]] ·
[[prd-143-redos-regex-audit-input-validation|PRD-143]] ·
[[prd-142-supply-chain-provenance-typecheck-gate|PRD-142]] ·
[[prd-121-auditable-package-sourcemap|PRD-121]] ·
[[prd-122-marketplace-trust-metadata|PRD-122]]

**Tema:** valor visível ao usuário e postura de segurança/distribuição, depois que
a arquitetura (128/129/138) e o CI (125) estabilizaram. A **133** e a **132**
fecham a UX de execução; a **140** e a **141** cuidam de status bar, settings,
onboarding e acessibilidade; a **143** endurece a entrada; a **142**, a **121** e
a **122** fecham a cadeia de distribuição (proveniência, pacote auditável e
política de privacidade). Ordem sugerida: **133 → 132 → 140 → 141 → 143 → 142 →
121 → 122**.

**Dependências:** a 132 e a 140 vêm depois da 129/128 (orquestração e event bus,
0.21.0); a 141 depois da 140; a 142 depois da 125 (matriz de CI, 0.19.0); a fase
de repositório da 122 (política + `PRIVACY.md`) pode ser antecipada como
docs-only, e a verificação do publisher/portal fica nesta versão.

**Total estimado:** ≈ 7,5–12,5 dias.

## Fluxo de execução (por PRD)

1. `status: approved → in-progress` no frontmatter → `npm run brain:sync && npm run brain:build` + `npm run sync-prds`.
2. Implementar com TDD; manter cobertura ≥ thresholds do `.c8rc`.
3. Ao concluir: `status: completed` + `versao: "0.24.0"`; criar as regras
   `BR-*`/`SEC-*` e rodar `npm run brain:rules`; entry no `CHANGELOG.md`.
4. `npm run brain:ci` + `npm run docs:check` antes de cada PR.

## Relacionado

- [[MOC - PRDs]]
- [[Roadmap - 0.23.0 (planejamento)]]
