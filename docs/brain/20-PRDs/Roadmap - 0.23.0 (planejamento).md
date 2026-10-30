---
tipo: nota
status: ativo
modulo: prds
data: 2026-10-10
verificado: 2026-10-30
tags: [prd, roadmap, planejamento]
---

# Roadmap — 0.23.0 (planejamento)

Plano da **0.23.0 — “Docs e qualidade residual”**. O status e a versão alvo são a
**fonte da verdade** no frontmatter das notas `prd-*`: ver [[MOC - PRDs]] e
[docs/prd/index.md](../../../docs/prd/index.md).

## Escopo

| Ordem | PRD | Título | Esforço | Complexidade |
|---|---|---|---|---|
| 1 | PRD-112 | Auditoria de tratamento de erros: `catch` silenciosos e robustez | 1–2 dias | Baixa-Média |
| 2 | PRD-116 | Testes diretos dos módulos sem cobertura dedicada | 0,5–1 dia | Baixa |
| 3 | PRD-117 | Testes de propriedade do parser de scripts (`splitScript`) | 1–2 dias | Média |
| 4 | PRD-126 | Cobertura de branches nos módulos críticos e CLIs de release | 1–2 dias | Média |
| 5 | PRD-97 | Documentação no site (Fase 2 da PRD-96) | 2–3 dias | Média |
| 6 | PRD-99 | Cérebro reutilizável: guia de uso e reuso do knowledge base | 1–2 dias | Baixa-Média |

**PRDs:** [[prd-112-error-handling-audit|PRD-112]] ·
[[prd-116-direct-module-tests|PRD-116]] ·
[[prd-117-split-script-property-tests|PRD-117]] ·
[[prd-126-branch-coverage-cli-tests|PRD-126]] ·
[[prd-97-doc-no-site|PRD-97]] · [[prd-99-brain-reuse|PRD-99]]

**Tema:** itens de **baixo valor direto ao usuário** (docs) e a qualidade interna
residual. Ficam por último de propósito: entregar valor ao usuário primeiro. A
ordem **112 → 116 → 117 → 126** roda depois dos refactors da 0.21.0, evitando
retrabalho de testes; **97 → 99** fecha a documentação.

**Reorganização (2026-10-30, nivelamento):** a **PRD-121** (source map do VSIX) e
a **PRD-122** (publisher/privacidade) saíram para a 0.24.0, junto dos itens de
UX/segurança/distribuição; a **PRD-132** e a **PRD-133**, que estavam órfãs nesta
versão, também foram para a 0.24.0. A 0.23.0 fica só com qualidade e docs.

**Total estimado:** ≈ 6,5–12 dias.

## Fluxo de execução (por PRD)

1. `status: approved → in-progress` no frontmatter → `npm run brain:sync && npm run brain:build` + `npm run sync-prds`.
2. Implementar com TDD; manter cobertura ≥ thresholds do `.c8rc`.
3. Ao concluir: `status: completed` + `versao: "0.23.0"`; criar as regras
   `BR-*`/`SEC-*` e rodar `npm run brain:rules`; entry no `CHANGELOG.md`.
4. `npm run brain:ci` + `npm run docs:check` antes de cada PR.

## Relacionado

- [[MOC - PRDs]]
- [[Roadmap - 0.22.0 (planejamento)]] · [[Roadmap - 0.24.0 (planejamento)]]
