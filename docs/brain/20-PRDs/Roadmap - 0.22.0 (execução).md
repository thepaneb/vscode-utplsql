---
tipo: nota
status: ativo
modulo: prds
data: 2026-10-09
verificado: 2026-11-25
tags: [prd, roadmap, execucao]
---

# Roadmap — 0.22.0 (execução)

Plano de execução da **0.22.0 — “Localização completa”**. O status e a versão alvo
são a **fonte da verdade** no frontmatter das notas `prd-*`: ver
[[MOC - PRDs]] e [docs/prd/index.md](../../../docs/prd/index.md).

## Escopo aprovado

| Ordem | PRD | Título | Esforço | Complexidade |
|---|---|---|---|---|
| 1 | PRD-115 | Fatiar `i18nLocales.ts` por locale | 1,5–2,5 dias | Média |
| 2 | PRD-88 | Formatação sensível a locale (números e durações) | 0,5–1 dia | Baixa |
| 3 | PRD-90 | Plurais (CLDR) e seleção no catálogo de mensagens | 2–3 dias | Média-Alta |
| 4 | PRD-89 | Pseudo-localização e gate de strings não traduzidas | 1 dia | Baixa-Média |
| 5 | PRD-91 | Paridade de documentação e distribuição localizada | 1–2 dias | Média |
| 6 | PRD-92 | RTL e novos locales (árabe e hebraico) | 2–3 dias | Média |
| 7 | PRD-93 | Pipeline de localização contínua (glossário, TM e revisão) | 2–3 dias | Média |

**PRDs:** [[prd-115-split-i18n-locales|PRD-115]] ·
[[prd-88-locale-aware-formatting|PRD-88]] ·
[[prd-90-message-plurals-cldr|PRD-90]] ·
[[prd-89-pseudo-localization-gate|PRD-89]] ·
[[prd-91-doc-parity-localized-distribution|PRD-91]] ·
[[prd-92-rtl-new-locales|PRD-92]] ·
[[prd-93-continuous-localization-pipeline|PRD-93]]

**Tema:** o bloco de localização inteiro numa release. A **115** abre, fatiando os
catálogos para reduzir conflito; a **88** e a **90** cuidam de formatação e
plurais; a **89** fecha a rede de segurança de strings; a **91** alinha docs e
distribuição; a **92** adiciona RTL/novos locales e a **93** sustenta o pipeline.
Ordem sugerida: **115 → (88 ∥ 91) → 90 → 89 → 92 → 93**.

**Reorganização (2026-10-30, nivelamento):** as antigas 0.21.0 (“formatação,
plurais e paridade”) e 0.22.0 (“RTL, novos locales e pipeline”) foram fundidas
aqui para nivelar a carga. A **PRD-115** veio da 0.19.0 e continua **antes** das
features 88–93, como o plano original exigia.

**Total estimado:** ≈ 10–16 dias (implementação + docs/regras; release à parte).

## Branch de integração

A versão é integrada em **`release/v0.22.0`** (criada da `main` em 0.21.0, já
publicada). Cada PRD usa um branch próprio (`feat/prd-NNN-…`) com PR para a
branch de integração; o merge para a `main` é **um PR único** no fim e exige
**aprovação explícita do mantenedor**. **Sem pré-bump** nesta versão: o
`package.json`/lock/CHANGELOG/site são atualizados no release, como na 0.21.0.
O CI roda em `push`/`pull_request` de `release/**`.

## Prontidão para execução (2026-11-25)

As sete PRDs saíram para **`approved`** e as questões em aberto foram fechadas:

- **PRD-115 — split:** remover `src/i18nLocales.ts` (sem reexport), criar
  `src/i18n/locales/<locale>.ts` + barrel com `LOCALE_CODES`; derivar
  `ExtensionLocale`/`catalogs` do registry e manter os prefixos de
  `resolveLocale` explícitos. Inclui o **sweep de docs/regras/diagrama** (RF5):
  wiki, functional, NFR-006, `BR-I18N-001`, `BR-COB-001`, agentes e o SVG.
- **PRD-88 — formatação:** `formatNumber`/`formatDuration` em `i18n.ts`; status
  bar **sem** grouping e prosa **com** grouping; duração `12,3 s` (e `850 ms`);
  `t()` formata `count`/`total`; o sufixo de duração do Test Explorer também
  passa pelo helper (`state.ts`/`results.ts`/`testTree.ts`).
- **PRD-90 — plurais:** sem `select` nesta release; catálogo aceita
  `string | { one, few, many, other }`; seleção por `Intl.PluralRules` com
  fallback `other → pt-BR → chave`; aplicar depois da 115; ADR nova + revisão do
  ADR-007.
- **PRD-89 — pseudo/gate:** transformação depois da interpolação; scanner por
  parser léxico ancorado (`show*Message`), **aviso** no CI (`--strict` opt-in) e
  allowlist versionada; integração no `docs-check`.
- **PRD-91 — paridade:** comparar tokens normalizados + âncoras por seção (não
  prosa); registry em nota manual `12-I18n/Registro de locales.md`; remover o
  “23” hardcoded do `docs-check`.
- **PRD-92 — RTL:** só `ar`/`he` (26 locales/25 variantes); isolamento bidi só
  em parâmetros técnicos; atualizar switcher das 25 notas de README, enum,
  `NFR-006` e o agente `i18n-reviewer`. Sem revisor até o aceite → **beta** no
  registro, sem bloquear a release.
- **PRD-93 — pipeline:** scripts próprios (sem TMS); export JSON; `i18n-apply`
  regenera o arquivo inteiro + Biome; glossário e donos no vault (registro da
  91); gate único de paridade/plural/pseudo/glossário.

## Baseline (2026-11-25)

- Unitários: **1876 testes / 1872 pass / 4 skip / 0 fail**
  (`npm run test:unit`).
- Cobertura: **98,9% linhas/statements · 94,7% branches · 98,66% funções**
  (`npm run test:coverage`; thresholds 97/94/98).
- Bundle ESM: **743.217 bytes** (725,8 KiB) em `dist/extension.mjs`
  (`npm run bundle`).
- Docs/gates: `docs:check`, `version:check`, `brain:check` e `brain:rules`
  verdes no início; revalidar ao fim do prep.

## Ordem de execução

| Fase | PRD | Depende de | Por quê |
|---|---|---|---|
| 1 | PRD-115 | — | Fundação: um arquivo por locale reduz conflito nas fases seguintes; inclui o sweep de docs. |
| 2 | PRD-88 + PRD-91 (paralelo) | 115 (para 88); — (para 91) | 88 mexe em `i18n.ts`/status bar; 91 mexe só em scripts/docs e destrava a 92. |
| 3 | PRD-90 | 115 | Plurais mudam a forma dos 26 catálogos (já fatiados). |
| 4 | PRD-89 | 90 | Pseudo transforma a mensagem já resolvida (plural incluso). |
| 5 | PRD-92 | 90 + 91 | `ar`/`he` exigem as 6 categorias de plural e o gate de variantes. |
| 6 | PRD-93 | 89 + 90 + 91 | Pipeline escreve nos catálogos fatiados e reusa os gates/registro. |

> WIP recomendado: **2 PRDs** (a 88 e a 91 podem andar juntas; 90, 89, 92 e 93
> são sequenciais por tocar `i18n.ts`/catálogos).

## Progresso

| PRD | Status | Issue |
|---|---|---|
| PRD-115 | ✅ completed (PR #328) | #186 |
| PRD-88 | ✅ completed (PR #329) | #126 |
| PRD-90 | ✅ completed (PR #333) | #128 |
| PRD-89 | ✅ completed (PR #331) | #127 |
| PRD-91 | ✅ completed (PR #330) | #129 |
| PRD-92 | ✅ completed (PR #334) | #130 |
| PRD-93 | ✅ completed (PR #332) | #131 |

> As **7 PRDs** estão concluídas e mergeadas na `release/v0.22.0`: 115 (#328),
> 88 (#329), 91 (#330), 89 (#331), 93 (#332), 90 (#333) e 92 (#334). O release
> PR é o **#335**; as traduções de `ar`/`he` e as formas plurais seguem em
> draft/beta até a revisão in-country.

## Validação final (2026-11-26)

- Unitários: **1925 testes / 1921 pass / 4 skip / 0 fail** (`npm run test:unit`).
- Cobertura: **98,92% linhas/statements · 94,5% branches · 98,74% funções**.
- Matriz no commit `624ccc4`: thin full 18c/21c/23ai + multiroot ✅ · thick smoke
  18c/21c/23ai ✅ · thick full 23ai/11g ✅ · 19ee smoke ✅.
- Correções Oracle da validação no `DEMO`: descoberta pela ordem de nomes,
  qualificação de `ut_runner.run`/tipos/reporters/buffer e synonyms `UT`/`DBMSPCC_*`
  documentados no guia de setup.
- Ferramental de IA incluído como groundwork: P0 da PRD-153, Fase 1 da PRD-154 e
  a proposta da PRD-155 (Jev fallback/gates + disclosure); a conclusão dessas
  PRDs permanece na 0.24.0.
- Dependabot incluído na release: `fast-xml-parser` 5.12.1,
  `@vscode/vsce` 4.1.1 e os pins de Scorecard/CodeQL.
- Gates: `docs:check`, `docs:fidelity`, `version:check`, `brain:ci` verdes.

## Fluxo de execução (por PRD)

1. `status: approved → in-progress` no frontmatter → `npm run brain:sync && npm run brain:build` + `npm run sync-prds`.
2. Implementar com TDD; manter cobertura ≥ thresholds do `.c8rc`.
3. Ao concluir: `status: completed` + `versao: "0.22.0"`; criar as regras
   `BR-*`/`SEC-*` e rodar `npm run brain:rules`; entry no `CHANGELOG.md`.
4. `npm run brain:ci` + `npm run docs:check` antes de cada PR.

## Contingência

- **ar/he sem revisor:** entram como **beta** no `Registro de locales`; o
  suporte RTL/bidi e a paridade de catálogo não são bloqueados. A revisão
  in-country vira pendência explícita da 0.23.0.
- **Traduções draft (PRD-90/92):** entram na 0.22.0 como **beta/draft**; a revisão
  in-country de plurais e RTL fica registrada como pendência da 0.23.0 e não
  bloqueia a release.
- **PRD-89:** o scanner fica em **aviso** no CI (`--strict` opt-in), sem bloquear
  a release.
- **Conflito nos catálogos:** 90/92/93 só entram depois da 115; se a 115 atrasar,
  as demais esperam (não abrir exceção para editar o arquivo monolítico).

## Relacionado

- [[MOC - PRDs]]
- [[Roadmap - 0.21.0 (planejamento)]] · [[Roadmap - 0.23.0 (planejamento)]]
