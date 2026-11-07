---
tipo: nota
status: ativo
modulo: prds
data: 2026-11-07
verificado: 2026-11-07
tags: [prd, roadmap, execucao]
---

# Roadmap — 0.20.1 (execução)

Patch de **confiabilidade** logo após a 0.20.0. O status e a versão alvo são a
**fonte da verdade** no frontmatter das notas `prd-*`: ver [[MOC - PRDs]] e
[docs/prd/index.md](../../../docs/prd/index.md).

## Escopo

| Ordem | PRD | Título | Esforço | Complexidade |
|---|---|---|---|---|
| 1 | PRD-148 | Confiabilidade de execução e estado após a auditoria 0.20.0 | 2–3 dias | Média |

**PRDs:** [[prd-148-execution-state-reliability|PRD-148]]

**Tema:** fechar o residual P1 da auditoria da 0.20.0 (serialização de runs,
auto-run replace, diagnósticos de compilação, restore no schema mode, fusão de
suites, atividade Oracle, IDs com schema e parsers de entrada) sem esperar a
refatoração de arquitetura da 0.21.0.

**Fora do escopo:** performance (PRD-149), hardening de segurança (PRD-144) e
refatorações da 0.21.0.

**Total estimado:** ≈ 2–3 dias.

## Fluxo de execução (por PRD)

1. `status: approved → in-progress` no frontmatter → `npm run brain:sync && npm run brain:build` + `npm run sync-prds`.
2. Implementar com TDD; manter cobertura ≥ thresholds do `.c8rc`.
3. Ao concluir: `status: completed` + `versao: "0.20.1"`; criar as regras
   `BR-*`/`SEC-*` e rodar `npm run brain:rules`; entry no `CHANGELOG.md`.
4. `npm run brain:ci` + `npm run docs:check` antes do PR.

## Relacionado

- [[MOC - PRDs]]
- [[Roadmap - 0.20.0 (planejamento)]] · [[Roadmap - 0.21.0 (planejamento)]]
