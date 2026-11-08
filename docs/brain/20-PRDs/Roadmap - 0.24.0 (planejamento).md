---
tipo: nota
status: ativo
modulo: prds
data: 2026-10-30
verificado: 2026-11-07
tags: [prd, roadmap, planejamento]
---

# Roadmap — 0.24.0 (planejamento)

Plano da **0.24.0 — “Segurança e distribuição”**. O status e a versão alvo são
a **fonte da verdade** no frontmatter das notas `prd-*`: ver [[MOC - PRDs]] e
[docs/prd/index.md](../../../docs/prd/index.md).

> **Reorganização (2026-11-07):** a onda de UX (PRD-132, PRD-133, PRD-140,
> PRD-141 e a nova PRD-151) saiu desta versão para a **0.25.0**, deixando a
> 0.24.0 focada em segurança e distribuição. A 0.24.0 tinha 10 PRDs
> (≈9,5–16,5 dias) e dois temas distintos; a separação reduz o risco de a
> release de segurança escorregar por causa de UX e vice-versa.

## Escopo

| Ordem | PRD | Título | Esforço | Complexidade |
|---|---|---|---|---|
| 1 | PRD-143 | Auditoria de ReDoS/regex e validação de entrada | 1–2 dias | Média |
| 2 | PRD-144 | Hardening de segurança do runtime: parsers, path traversal e redação | 1–2 dias | Média |
| 3 | PRD-145 | Segurança do entregável: logging, cadeia de build e alertas | 1–2 dias | Média |
| 4 | PRD-142 | Proveniência (SLSA) no release e gate de typecheck no CI | 0,5–1 dia | Baixa |
| 5 | PRD-121 | Pacote auditável: source map do bundle no VSIX | 0,5 dia | Baixa |
| 6 | PRD-122 | Confiança na distribuição: publisher verificado e política de privacidade | 1–2 dias | Baixa-Média |

**PRDs:** [[prd-143-redos-regex-audit-input-validation|PRD-143]] ·
[[prd-144-security-runtime-hardening|PRD-144]] ·
[[prd-145-security-alerts-deliverable|PRD-145]] ·
[[prd-142-supply-chain-provenance-typecheck-gate|PRD-142]] ·
[[prd-121-auditable-package-sourcemap|PRD-121]] ·
[[prd-122-marketplace-trust-metadata|PRD-122]]

**Tema:** postura de segurança e cadeia de distribuição, depois que a
arquitetura (128/129/138) e o CI (125, 0.20.0) estabilizaram. A **143**, a **144**
e a **145** endurecem entrada, runtime e entregável; a **142**, a **121** e a
**122** fecham a cadeia de distribuição (proveniência, pacote auditável e
política de privacidade). Ordem sugerida:
**143 → 144 → 145 → 142 → 121 → 122**.

**Dependências:** a 142 depois da 125 (matriz de CI, 0.19.0–0.20.0); a fase de
repositório da 122 (política + `PRIVACY.md`) pode ser antecipada como docs-only,
e a verificação do publisher/portal fica nesta versão. A **144** e a **145**
entram depois da 143, fechando o bloco de segurança antes da distribuição.

**Total estimado:** ≈ 5,5–9,5 dias.

## Fluxo de execução (por PRD)

1. `status: approved → in-progress` no frontmatter → `npm run brain:sync && npm run brain:build` + `npm run sync-prds`.
2. Implementar com TDD; manter cobertura ≥ thresholds do `.c8rc`.
3. Ao concluir: `status: completed` + `versao: "0.24.0"`; criar as regras
   `BR-*`/`SEC-*` e rodar `npm run brain:rules`; entry no `CHANGELOG.md`.
4. `npm run brain:ci` + `npm run docs:check` antes de cada PR.

## Relacionado

- [[MOC - PRDs]]
- [[Roadmap - 0.23.0 (planejamento)]]
