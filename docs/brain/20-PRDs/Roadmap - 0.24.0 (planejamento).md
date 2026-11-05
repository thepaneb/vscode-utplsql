---
tipo: nota
status: ativo
modulo: prds
data: 2026-10-30
verificado: 2026-11-05
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
| 6 | PRD-144 | Hardening de segurança do runtime: parsers, path traversal e redação | 1–2 dias | Média |
| 7 | PRD-145 | Segurança do entregável: logging, cadeia de build e alertas | 1–2 dias | Média |
| 8 | PRD-142 | Proveniência (SLSA) no release e gate de typecheck no CI | 0,5–1 dia | Baixa |
| 9 | PRD-121 | Pacote auditável: source map do bundle no VSIX | 0,5 dia | Baixa |
| 10 | PRD-122 | Confiança na distribuição: publisher verificado e política de privacidade | 1–2 dias | Baixa-Média |

**PRDs:** [[prd-133-rate-limiting-keybindings|PRD-133]] ·
[[prd-132-ux-execution-dryrun-jump|PRD-132]] ·
[[prd-140-statusbar-settings-grouping|PRD-140]] ·
[[prd-141-onboarding-walkthrough-accessibility|PRD-141]] ·
[[prd-143-redos-regex-audit-input-validation|PRD-143]] ·
[[prd-144-security-runtime-hardening|PRD-144]] ·
[[prd-145-security-alerts-deliverable|PRD-145]] ·
[[prd-142-supply-chain-provenance-typecheck-gate|PRD-142]] ·
[[prd-121-auditable-package-sourcemap|PRD-121]] ·
[[prd-122-marketplace-trust-metadata|PRD-122]]

**Tema:** valor visível ao usuário e postura de segurança/distribuição, depois que
a arquitetura (128/129/138) e o CI (125, 0.20.0) estabilizaram. A **133** e a **132**
fecham a UX de execução; a **140** e a **141** cuidam de status bar, settings,
onboarding e acessibilidade; a **143**, a **144** e a **145** endurecem entrada,
runtime e entregável; a **142**, a **121** e a **122** fecham a cadeia de
distribuição (proveniência, pacote auditável e política de privacidade). Ordem
sugerida: **133 → 132 → 140 → 141 → 143 → 144 → 145 → 142 → 121 → 122**.

**Dependências:** a 132 e a 140 vêm depois da 129/128 (orquestração e event bus,
0.21.0); a 141 depois da 140; a 142 depois da 125 (matriz de CI, 0.19.0–0.20.0); a fase
de repositório da 122 (política + `PRIVACY.md`) pode ser antecipada como
docs-only, e a verificação do publisher/portal fica nesta versão.

**Reorganização (2026-11-05):** as PRDs **144** e **145** (hardening de segurança
do runtime e do entregável), criadas em 2026-11-05 e declaradas para a 0.24.0,
entram no escopo depois da 143 e antes da 142, fechando o bloco de segurança
antes da cadeia de distribuição.

**Total estimado:** ≈ 9,5–16,5 dias.

## Fluxo de execução (por PRD)

1. `status: approved → in-progress` no frontmatter → `npm run brain:sync && npm run brain:build` + `npm run sync-prds`.
2. Implementar com TDD; manter cobertura ≥ thresholds do `.c8rc`.
3. Ao concluir: `status: completed` + `versao: "0.24.0"`; criar as regras
   `BR-*`/`SEC-*` e rodar `npm run brain:rules`; entry no `CHANGELOG.md`.
4. `npm run brain:ci` + `npm run docs:check` antes de cada PR.

## Relacionado

- [[MOC - PRDs]]
- [[Roadmap - 0.23.0 (planejamento)]]
