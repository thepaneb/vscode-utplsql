---
tipo: nota
status: concluida
modulo: prds
data: 2026-10-10
verificado: 2026-10-15
concluida: 2026-10-15
tags: [prd, roadmap, planejamento]
---

# Roadmap — 0.16.0 (execução)

Plano de execução da **0.16.0 — “Produtividade e resultados”**. O status e a versão
alvo são a **fonte da verdade** no frontmatter das notas `prd-*`: ver
[[MOC - PRDs]] e [docs/prd/index.md](../../../docs/prd/index.md).

## Escopo aprovado

| Ordem | PRD | Título | Esforço | Complexidade |
|---|---|---|---|---|
| 1 | PRD-59 + PRD-100 | Scaffold de suíte (esqueleto + avançado) — **entrega única** | 3–5 dias | Média-Alta |
| 2 | PRD-56 | Duração por teste e persistência de resultados | 1 dia | Baixa-Média |
| 3 | PRD-57 | Multi-root: resolução de `root`/`sourcePath` por folder | 1–2 dias | Média |
| 4 | PRD-58 | Run Related Tests | 1 dia | Média |

**PRDs:** [[prd-59-scaffold-suite|PRD-59]] ·
[[prd-100-generate-test-suite|PRD-100]] · [[prd-56-duration-persistence|PRD-56]] ·
[[prd-57-multiroot-root-resolution|PRD-57]] · [[prd-58-run-related-tests|PRD-58]]

**Tema:** produtividade do dia a dia — geração de suíte, resultados persistentes e
execução relacionada. Ordem sugerida: **PRD-59 + PRD-100** (entrega única, ver
abaixo); depois **56 → 57 → 58**.

**Reorganização (2026-10-10):** esta versão passa a abrir o roadmap de features
por ser a de **maior ganho visível ao usuário**; era a antiga 0.17.0. Todo o
bloco de runtime/docs foi movido para o fim (ver [[Roadmap - 0.23.0 (planejamento)]]).

## Prontidão para execução (2026-10-14)

As quatro notas **propostas saíram para `approved`** e as ambiguidades foram
fechadas (as datas de `verificado` passaram a 2026-10-14):

- **PRD-59 + PRD-100 são uma entrega única** (`feat/prd-59-100-scaffold`) e
  compartilham **um** comando, `utplsql.generateTestSuite`: sem rotinas
  parseáveis cai no esqueleto (59); com rotinas, gera um `%test` por rotina (100).
- **PRD-100 expõe só 4 settings de núcleo** (`testPackagePrefix`,
  `testPackageSuffix`, `numberOfTestsPerUnit`, `generateComments`); as outras
  cinco previstas ficam com default fixo e viram follow-up.
- **PRD-58**: keybinding `ctrl+shift+u shift+r` (o `ctrl+shift+u r` já é do Run
  All); comando `utplsql.runRelated`, função pura em `matching.ts`.
- **PRD-56**: persistência no `workspaceState`, `Memento` injetado por **setter**;
  setting `utplsql.showTestDuration`.
- **PRD-57**: `runner.ts:139` (não `:49`); a fixture multi-root
  (`e2e-multiroot.code-workspace` + `.vscode-test.multiroot.mjs`) já existe.

> **Custo de docs/i18n é gate de CI** — o `docs:check` (`docs-fidelity`) falha se
> uma setting não constar no `README.md` **e nas 23 variantes**:
> 5 settings × 24 notas de README, *Known limitations* remoção × 24 (PRD-57),
> 2 comandos × (nls en + 23 locales + `i18nLocales.ts`) e as tabelas de
> Commands/Keybindings (24 notas) + wiki. O `CHANGELOG.md` ganha a seção
> `## 0.16.0` na primeira entrega; o bump de versão fica para o release.

## Estratégia de branches da versão (2026-10-14)

A versão usa uma **branch de integração** — todas as entregas entram nela e um
**PR único** dela vai para o `main`:

```
main
 └── release/v0.16.0            ← integração (concentra a versão) + PR (draft) → main
      ├── feat/prd-59-100-scaffold      → PR para release/v0.16.0
      ├── feat/prd-56-duration-persistence
      ├── feat/prd-57-multiroot-root
      └── feat/prd-58-run-related
```

- Cada entrega tem a **sua** branch, criada a partir de `release/v0.16.0`, com PR
  próprio **contra a branch de integração** (não contra o `main`).
- O `ci.yml` passou a rodar também em PRs para `release/**` (antes só `main`), para
  que os PRs das entregas continuem verificados por compile/lint/test + `brain:ci`
  + `docs:check`.
- O `CHANGELOG.md` recebe a seção `## 0.16.0` na primeira entrega e é alimentado a
  cada PRD concluída dentro da branch de integração.
- Ao fim da versão: `Closes` preenchido a partir de `npm run pr:create -- --closes`
  (PRDs em `completed`), bump de versão + release pela skill `release`, e o PR de
  `release/v0.16.0` → `main` sai de *draft*.

**Total estimado:** ≈ 6–9 dias.

## Fluxo de execução (por PRD)

1. `status: approved → in-progress` no frontmatter → `npm run brain:sync && npm run brain:build` + `npm run sync-prds`.
2. Implementar com TDD; manter cobertura ≥ thresholds do `.c8rc`
   (97% lines/statements, 97% functions, 93% branches).
3. Ao concluir: `status: completed` + `versao: "0.16.0"`; criar as regras
   `BR-*`/`SEC-*` (`prds:`/`implementacao:`/`testes:`) e rodar `npm run brain:rules`;
   entry no `CHANGELOG.md`.
4. `npm run brain:ci` + `npm run docs:check` antes de cada PR.

## Definição de pronto (release)

- 5 PRDs concluídos com `versao: "0.16.0"` (56, 57, 58, 59 e 100) e vínculo
  bidirecional PRD ↔ regra (`BR-QUAL-003`, `BR-COB-007`, `BR-UI-014`,
  `BR-UI-015`).
- `package.json` = `0.16.0` + seção `## 0.16.0` no `CHANGELOG.md`.
- Integração + matriz Oracle (thin/thick) verdes; cobertura publicada no Codecov.
- Publicação via **GitHub release** → `publish.yml` (skill `release`) → post do
  LinkedIn.

## Status — concluída (0.16.0)

Release **0.16.0 “Produtividade e resultados”** publicada. Os **5 PRDs** do escopo
(56, 57, 58, 59 e 100) estão `completed` com `versao: "0.16.0"`; `package.json` =
`0.16.0` e `CHANGELOG.md` com a seção `## 0.16.0`.

- **Entregas:** scaffold de suíte (`utplsql.generateTestSuite`, PRD-59 + PRD-100,
  entrega única), duração/persistência (PRD-56), multi-root `root`/`sourcePath`
  por folder (PRD-57) e Run Related Tests (PRD-58).
- **Testes:** 1311 unitários + E2E (`v016-features`); 2 bugs reais encontrados e
  corrigidos na ampliação (cobertura duplicada em multi-root e sufixo de duração
  acumulado).
- **Matriz Oracle:** thin e thick **verdes** (12.2, 18xe, 19ee, 21xe, 23free) +
  smoke local e integração completa.
- **Docs:** `docs:check`/`brain:ci` verdes; controle novo de **conteúdo
  descontinuado** (checks de stale no `docs-fidelity`) e auditoria de
  consistência de **features** (README × wiki × funcional).
- **Publicação:** GitHub release (`publish.yml`) e post de release.

Roadmap **encerrado** — o próximo tema é **0.17.0** (PRD-105/108/109).

## Relacionado

- [[MOC - PRDs]]
- [[Roadmap - 0.15.0 (execução)]] · [[Roadmap - 0.17.0 (planejamento)]]
