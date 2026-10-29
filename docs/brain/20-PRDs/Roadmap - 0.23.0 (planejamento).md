---
tipo: nota
status: ativo
modulo: prds
data: 2026-10-10
verificado: 2026-10-29
tags: [prd, roadmap, planejamento]
---

# Roadmap — 0.23.0 (planejamento)

Plano da **0.23.0 — “Runtime, docs e qualidade residual”**. O status e a versão
alvo são a **fonte da verdade** no frontmatter das notas `prd-*`: ver
[[MOC - PRDs]] e [docs/prd/index.md](../../../docs/prd/index.md).

## Escopo

| Ordem | PRD | Título | Esforço | Complexidade |
|---|---|---|---|---|
| 1 | PRD-112 | Auditoria de tratamento de erros: `catch` silenciosos e robustez | 1–2 dias | Baixa-Média |
| 2 | PRD-116 | Testes diretos dos módulos sem cobertura dedicada | 0,5–1 dia | Baixa |
| 3 | PRD-117 | Testes de propriedade do parser de scripts (`splitScript`) | 1–2 dias | Média |
| 4 | PRD-126 | Cobertura de branches nos módulos críticos e CLIs de release | 1–2 dias | Média |
| 5 | PRD-95 | Modernização do runtime: ESM, ES2023 e stdlib Node 22 | 2–3 dias | Média |
| 6 | PRD-97 | Documentação no site (Fase 2 da PRD-96) | 2–3 dias | Média |
| 7 | PRD-99 | Cérebro reutilizável: guia de uso e reuso do knowledge base | 1–2 dias | Baixa-Média |
| 8 | PRD-121 | Pacote auditável: source map do bundle no VSIX | 0,5 dia | Baixa |
| 9 | PRD-122 | Confiança na distribuição: publisher verificado e política de privacidade | 1–2 dias | Baixa-Média |

**PRDs:** [[prd-112-error-handling-audit|PRD-112]] ·
[[prd-116-direct-module-tests|PRD-116]] ·
[[prd-117-split-script-property-tests|PRD-117]] ·
[[prd-126-branch-coverage-cli-tests|PRD-126]] ·
[[prd-95-esm-es2023-node22|PRD-95]] · [[prd-97-doc-no-site|PRD-97]] ·
[[prd-99-brain-reuse|PRD-99]] · [[prd-121-auditable-package-sourcemap|PRD-121]] ·
[[prd-122-marketplace-trust-metadata|PRD-122]]

**Tema:** itens de **baixo valor direto ao usuário** (runtime/docs) e a qualidade
interna residual. Ficam por último de propósito: entregar valor ao usuário
primeiro. Ordem sugerida: **112 → 116 → 117 → 126** (qualidade) e **95 → 97 → 99**
(runtime/docs); a PRD-126 trava a cobertura de branches e os CLIs de release
antes das refatorações de runtime.

**Reorganização (2026-10-10):** a antiga 0.23.0 (“Qualidade interna”) foi
esvaziada — os enablers (113/114 → 0.18.0; 111/115 → 0.19.0) foram para a frente.
O bloco de runtime/docs (95/97/99) veio da 0.16.0, e a qualidade residual
(112/116/117) permanece aqui.

**Complemento (2026-10-13):** a **PRD-121** (source map do bundle no VSIX, para
auditabilidade do pacote) e a **PRD-122** (política de privacidade + verificação do
publisher) entram aqui como qualidade residual de **empacotamento/distribuição**,
originadas da auditoria externa do VSCan do VSIX 0.15.0. São baratas: podem ser
antecipadas se houver auditoria planejada.

**Risco:** a PRD-95 (ESM/ES2023) é uma migração de build *big-bang*; adiada para o
fim, incide sobre um código maior. Se o churn pesar, promova a 95 para o início
(versão curtíssima de runtime) — decisão a revisar na aprovação.

**Total estimado:** ≈ 10–17,5 dias.

## Fluxo de execução (por PRD)

1. `status: approved → in-progress` no frontmatter → `npm run brain:sync && npm run brain:build` + `npm run sync-prds`.
2. Implementar com TDD; manter cobertura ≥ thresholds do `.c8rc`.
3. Ao concluir: `status: completed` + `versao: "0.23.0"`; criar as regras
   `BR-*`/`SEC-*` e rodar `npm run brain:rules`; entry no `CHANGELOG.md`.
4. `npm run brain:ci` + `npm run docs:check` antes de cada PR.

## Relacionado

- [[MOC - PRDs]]
- [[Roadmap - 0.22.0 (planejamento)]]
