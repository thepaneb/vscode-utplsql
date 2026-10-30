---
tipo: nota
status: ativo
modulo: prds
data: 2026-10-10
verificado: 2026-10-30
tags: [prd, roadmap, planejamento]
---

# Roadmap — 0.19.0 (planejamento)

Plano da **0.19.0 — “Piso Node 24 e runtime moderno”**. O status e a versão alvo
são a **fonte da verdade** no frontmatter das notas `prd-*`: ver [[MOC - PRDs]] e
[docs/prd/index.md](../../../docs/prd/index.md).

## Escopo

| Ordem | PRD | Título | Esforço | Complexidade |
|---|---|---|---|---|
| 1 | PRD-127 | Piso de VS Code 1.125 e runtime Node 24 | 1–2 dias | Média |
| 2 | PRD-47 | Node 24 no toolchain e Node 26 no CI | 0,5 dia | Baixa |
| 3 | PRD-95 | Modernização do runtime: ESM (`.mjs`), ES2024 e stdlib Node 24 | 2–3 dias | Média |
| 4 | PRD-111 | Decompor `executeRunOracle` e agrupar `OracleRunOptions` | 2–3 dias | Média-Alta |
| 5 | PRD-124 | Upgrade para node-oracledb 26 com matriz e packaging validados | 2–3 dias | Média-Alta |
| 6 | PRD-125 | Suíte completa em thick e matriz de bancos no CI | 2–3 dias | Média-Alta |

**PRDs:** [[prd-127-vscode-floor-1-125|PRD-127]] ·
[[prd-47-node-26-toolchain|PRD-47]] · [[prd-95-esm-es2023-node22|PRD-95]] ·
[[prd-111-decompose-oracle-runner|PRD-111]] ·
[[prd-124-oracledb-26-upgrade|PRD-124]] ·
[[prd-125-thick-full-matrix-ci|PRD-125]]

**Tema:** **plataforma e runtime primeiro**, refatorações depois. A PRD-127 sobe o
piso para VS Code 1.125 / Node 24.15.0; a PRD-47 mantém o toolchain em Node 24 e
cobre o 26 no CI; a PRD-95 aproveita o novo runtime para ESM (`.mjs`) e ES2024.
Só então vêm as refatorações que reduzem retrabalho: PRD-111 decompõe
`executeRunOracle` **antes** da instrumentação da PRD-102 (observabilidade), a
PRD-124 sobe o driver Oracle com matriz/packaging validados (issue #242), a
PRD-125 valida a suíte completa em thick (incluindo o 11g). A PRD-115 (fatiar os
catálogos i18n) migrou para a 0.22.0, onde abre o bloco de localização.

**Reorganização (2026-10-29):** a PRD-124 entrou após a PRD-111 (o runner já
decomposto reduz o conflito no upgrade do driver) e antes da PRD-102 (0.20.0).

**Reorganização (2026-10-30):** a 0.19.0 passa a abrir com o novo piso de
plataforma. A **PRD-127** (VS Code 1.125 / Node 24) e a **PRD-47** (toolchain
24 + CI 26) entram antes da **PRD-95**, que migra de 0.23.0 para cá e adota ESM
`.mjs` + ES2024. A ordem 127 → 47 → 95 é deliberada: o build/tipos precisam do
piso antes de modernizar o runtime.

**Reorganização (2026-10-30, nivelamento):** a **PRD-115** saiu para a 0.22.0,
que passou a concentrar todo o bloco de localização (115 + 88–93). A 0.19.0 fica
só com plataforma/runtime e fecha em ≈ 9,5–14,5 dias; a ordem 127 → 47 → 95
continua intacta.

**Contingência:** se o escopo apertar, as primeiras a descer para a 0.20.0 são
PRD-111/124/125; PRD-127/47/95 ficam juntas porque tocam o mesmo build/docs.

**Total estimado:** ≈ 9,5–14,5 dias.

## Fluxo de execução (por PRD)

1. `status: approved → in-progress` no frontmatter → `npm run brain:sync && npm run brain:build` + `npm run sync-prds`.
2. Implementar com TDD; manter cobertura ≥ thresholds do `.c8rc`; **nenhuma
   mudança de comportamento observável**.
3. Ao concluir: `status: completed` + `versao: "0.19.0"`; criar as regras
   `BR-*`/`SEC-*` e rodar `npm run brain:rules`; entry no `CHANGELOG.md`.
4. `npm run brain:ci` + `npm run docs:check` antes de cada PR.

## Relacionado

- [[MOC - PRDs]]
- [[Roadmap - 0.18.0 (planejamento)]] · [[Roadmap - 0.20.0 (planejamento)]]
