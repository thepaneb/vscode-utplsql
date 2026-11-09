---
tipo: nota
status: concluida
modulo: prds
data: 2026-11-07
verificado: 2026-11-09
concluida: 2026-11-09
tags: [prd, roadmap, execucao]
---

# Roadmap — 0.20.1 (execução)

> Publicada em **2026-11-09** como release `v0.20.1`
> ([GitHub](https://github.com/thepaneb/vscode-utplsql/releases/tag/v0.20.1)).

Patch de **confiabilidade** logo após a 0.20.0. O status e a versão alvo são a
**fonte da verdade** no frontmatter das notas `prd-*`: ver [[MOC - PRDs]] e
[docs/prd/index.md](../../../docs/prd/index.md).

## Escopo

| Ordem | PRD | Título | Esforço | Complexidade |
|---|---|---|---|---|
| 1 | PRD-148 | Confiabilidade de execução e estado após a auditoria 0.20.0 | 2–3 dias | Média |
| 2 | PRD-150 | Thick-full verdadeiro: inicialização thick e recuperação do pool após break | 1–2 dias | Média-Alta |

**PRDs:** [[prd-148-execution-state-reliability|PRD-148]] ·
[[prd-150-thick-full-true-pool-recovery|PRD-150]]

**Tema:** fechar o residual P1 da auditoria da 0.20.0 (serialização de runs,
auto-run replace, diagnósticos de compilação, restore no schema mode, fusão de
suites, atividade Oracle, IDs com schema e parsers de entrada) e corrigir a
recuperação do pool após timeout/cancelamento em thick, que mantém o eixo
`--thick-full` em cascata. Ambas são confiabilidade de execução e podem ser
entregues juntas.

**Ordem sugerida:** **148 → 150** — a 148 mexe na serialização de runs e no
encerramento de atividade; a 150 se apoia nesse ciclo para estabilizar o pool
thick e o host longo. Se a 148 escorregar, a 150 (menor e independente) pode
sair primeiro com os P0 já corrigidos.

**Fora do escopo:** performance (PRD-149), hardening de segurança (PRD-144),
refatorações da 0.21.0 e a onda de UX (0.25.0).

**Total estimado:** ≈ 3–5 dias (a nota anterior listava só a 148; a 150 entra
como residual da PRD-125/thick-full).

## Fluxo de execução (por PRD)

1. `status: approved → in-progress` no frontmatter → `npm run brain:sync && npm run brain:build` + `npm run sync-prds`.
2. Implementar com TDD; manter cobertura ≥ thresholds do `.c8rc`.
3. Ao concluir: `status: completed` + `versao: "0.20.1"`; criar as regras
   `BR-*`/`SEC-*` e rodar `npm run brain:rules`; entry no `CHANGELOG.md`.
4. `npm run brain:ci` + `npm run docs:check` antes do PR.

## Relacionado

- [[MOC - PRDs]]
- [[Roadmap - 0.20.0 (planejamento)]] · [[Roadmap - 0.21.0 (planejamento)]]
