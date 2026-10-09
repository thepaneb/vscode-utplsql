---
tipo: nota
status: ativo
modulo: prds
data: 2026-10-09
verificado: 2026-10-09
tags: [prd, roadmap, planejamento]
---

# Roadmap — 0.20.0 (planejamento)

Plano da **0.20.0 — “Qualidade e CI”**. O status e a versão alvo são a **fonte da
verdade** no frontmatter das notas `prd-*`: ver [[MOC - PRDs]] e
[docs/prd/index.md](../../../docs/prd/index.md).

## Escopo

| Ordem | PRD | Título | Esforço | Complexidade |
|---|---|---|---|---|
| 1 | PRD-104 | Cadeia de suprimentos do CI: Dependabot, pin de actions e auditoria de dependências | 0,5–1 d | Baixa |

**PRD:** [[prd-104-ci-supply-chain|PRD-104]]

**Tema:** saúde do repositório (cadeia de suprimentos). Versão enxuta; a
PRD-107 (fixture de teste) foi movida para a **0.19.0** para ficar junto da
PRD-101 que ela destrava. Vem depois da observabilidade/desempenho, que é mais
valiosa para o usuário.

## Fluxo de execução (por PRD)

1. `status: approved → in-progress` no frontmatter → `npm run brain:sync && npm run brain:build` + `npm run sync-prds`.
2. Ao concluir: `status: completed` + `versao: "0.20.0"`; criar as regras
   `BR-*`/`SEC-*` e rodar `npm run brain:rules`; entry no `CHANGELOG.md`.
3. `npm run brain:ci` + `npm run docs:check` antes do PR.

## Relacionado

- [[MOC - PRDs]]
- [[Roadmap - 0.19.0 (planejamento)]] · [[Roadmap - 0.21.0 (planejamento)]]
