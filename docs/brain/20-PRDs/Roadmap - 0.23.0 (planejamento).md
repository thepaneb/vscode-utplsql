---
tipo: nota
status: ativo
modulo: prds
data: 2026-10-10
verificado: 2026-10-10
tags: [prd, roadmap, planejamento]
---

# Roadmap — 0.23.0 (planejamento)

Plano da **0.23.0 — “Qualidade interna”**. O status e a versão alvo são a **fonte
da verdade** no frontmatter das notas `prd-*`: ver [[MOC - PRDs]] e
[docs/prd/index.md](../../../docs/prd/index.md).

## Escopo

| Ordem | PRD | Título | Esforço | Complexidade |
|---|---|---|---|---|
| 1 | PRD-111 | Decompor `executeRunOracle` e agrupar `OracleRunOptions` | 2–3 dias | Média-Alta |
| 2 | PRD-113 | Ampliar o escopo do lint (Biome) para todo o repositório | 0,5–1 dia | Baixa |
| 3 | PRD-112 | Auditoria de tratamento de erros: `catch` silenciosos e robustez | 1–2 dias | Baixa-Média |
| 4 | PRD-114 | Modernizar o stub de `vscode` e reduzir `any` nos testes | 2–3 dias | Média |
| 5 | PRD-115 | Fatiar `i18nLocales.ts` por locale | 1–2 dias | Média |
| 6 | PRD-117 | Testes de propriedade do parser de scripts (`splitScript`) | 1–2 dias | Média |
| 7 | PRD-116 | Testes diretos dos módulos sem cobertura dedicada | 0,5–1 dia | Baixa |

**PRDs:** [[prd-111-decompose-oracle-runner|PRD-111]] ·
[[prd-112-error-handling-audit|PRD-112]] ·
[[prd-113-lint-scope|PRD-113]] ·
[[prd-114-vscode-stub-modernization|PRD-114]] ·
[[prd-115-split-i18n-locales|PRD-115]] ·
[[prd-116-direct-module-tests|PRD-116]] ·
[[prd-117-split-script-property-tests|PRD-117]]

**Tema:** higiene e manutenibilidade do código — dívida técnica interna apontada
na avaliação de qualidade do projeto (não há feature de usuário). Nenhuma destas
PRDs muda comportamento observável; o contrato é *refatorar sem regressão*, com
cobertura mantida. Ordem sugerida: **111** (maior risco concentrado) → **113**
(destrava o restante) → **112 → 114 → 115 → 117 → 116**.

## Fluxo de execução (por PRD)

1. `status: approved → in-progress` no frontmatter → `npm run brain:sync && npm run brain:build` + `npm run sync-prds`.
2. Implementar com TDD; manter cobertura ≥ thresholds do `.c8rc`
   (97% lines/statements, 97% functions, 93% branches).
3. Ao concluir: `status: completed` + `versao: "0.23.0"`; criar as regras
   `BR-*`/`SEC-*` e rodar `npm run brain:rules`; entry no `CHANGELOG.md`.
4. `npm run brain:ci` + `npm run docs:check` antes do PR.

## Relacionado

- [[MOC - PRDs]]
- [[Roadmap - 0.22.0 (planejamento)]]
