---
tipo: nota
status: ativo
modulo: prds
data: 2026-10-10
verificado: 2026-10-10
tags: [prd, roadmap, planejamento]
---

# Roadmap — 0.18.0 (planejamento)

Plano da **0.18.0 — “Fundação: segurança, testes e anti-drift”**. O status e a
versão alvo são a **fonte da verdade** no frontmatter das notas `prd-*`: ver
[[MOC - PRDs]] e [docs/prd/index.md](../../../docs/prd/index.md).

## Escopo

| Ordem | PRD | Título | Esforço | Complexidade |
|---|---|---|---|---|
| 1 | PRD-110 | Hardening defensivo: identificador SQL, redaction de logs e scripts | 0,5–1 dia | Baixa |
| 2 | PRD-104 | Cadeia de suprimentos do CI: Dependabot, pin de actions e auditoria | 0,5–1 dia | Baixa |
| 3 | PRD-113 | Ampliar o escopo do lint (Biome) para além de `src/` | 0,5–1 dia | Baixa |
| 4 | PRD-114 | Modernizar o stub de `vscode` e reduzir `any` nos testes | 2–3 dias | Média |
| 5 | PRD-98 | Anti-drift de documentação: tabelas geradas e vínculo PRD→docs | 3–5 dias | Média-Alta |

**PRDs:** [[prd-110-defensive-hardening|PRD-110]] ·
[[prd-104-ci-supply-chain|PRD-104]] · [[prd-113-lint-scope|PRD-113]] ·
[[prd-114-vscode-stub-modernization|PRD-114]] · [[prd-98-docs-anti-drift|PRD-98]]

**Tema:** **enablers** que destravam e protegem as features seguintes — segurança,
lint mais amplo, testes (stub tipado) e anti-drift de documentação. A PRD-98 evita
repetir o que aconteceu na 0.15.0 (features entregues sem atualizar README/wiki).

**Reorganização (2026-10-10):** nova versão de fundação. Recebe os itens que antes
estavam espalhados em 0.16.0 (PRD-98), 0.20.0 (PRD-104/110) e 0.23.0 (PRD-113/114),
posicionados **antes** das features que tocam os mesmos arquivos.

**Total estimado:** ≈ 6,5–11 dias.

## Fluxo de execução (por PRD)

1. `status: approved → in-progress` no frontmatter → `npm run brain:sync && npm run brain:build` + `npm run sync-prds`.
2. Implementar com TDD; manter cobertura ≥ thresholds do `.c8rc`.
3. Ao concluir: `status: completed` + `versao: "0.18.0"`; criar as regras
   `BR-*`/`SEC-*` e rodar `npm run brain:rules`; entry no `CHANGELOG.md`.
4. `npm run brain:ci` + `npm run docs:check` antes de cada PR.

## Relacionado

- [[MOC - PRDs]]
- [[Roadmap - 0.17.0 (planejamento)]] · [[Roadmap - 0.19.0 (planejamento)]]
