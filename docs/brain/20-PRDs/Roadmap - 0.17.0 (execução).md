---
tipo: nota
status: concluida
modulo: prds
data: 2026-10-10
verificado: 2026-10-20
concluida: 2026-10-20
tags: [prd, roadmap, planejamento]
---

# Roadmap — 0.17.0 (execução)

Plano de execução da **0.17.0 — “UX de editor e cobertura”**. O status e a versão
alvo são a **fonte da verdade** no frontmatter das notas `prd-*`: ver
[[MOC - PRDs]] e [docs/prd/index.md](../../../docs/prd/index.md).

## Escopo aprovado

| Ordem | PRD | Título | Esforço | Complexidade |
|---|---|---|---|---|
| 1 | PRD-109 | Identidade de linguagem PL/SQL ampliada e `languageIds` configuráveis | 1 dia | Baixa |
| 2 | PRD-105 | Snippets utPLSQL: biblioteca de annotations e matchers | 1 dia | Baixa |
| 3 | PRD-108 | Relatório HTML de cobertura aberto no navegador | 1 dia | Baixa |

**PRDs:** [[prd-109-language-identity|PRD-109]] ·
[[prd-105-snippets|PRD-105]] · [[prd-108-coverage-html-report|PRD-108]]

**Tema:** features visíveis de editor e cobertura, de baixo custo. Ordem sugerida:
**109 → 105 → 108**. A PRD-105 pressupõe a PRD-100 (geração de suíte), entregue na
[[Roadmap - 0.16.0 (execução)|0.16.0]].

**Reorganização (2026-10-10):** era a antiga 0.18.0; mantém o foco de UX e passa a
vir logo após a versão de produtividade.

**Total estimado:** ≈ 3 dias de implementação; ≈ 4,5–5 dias com docs, i18n,
regras e release.

## Prontidão para execução (2026-10-20)

As três notas propostas saíram para **`approved`** e as questões em aberto foram
fechadas:

- **PRD-109 — language IDs:** mantido o id contribuído **`plsql`** (sem quebrar
  usuários/CodeLens existentes); `oracle-sql` é aceito como language ID de
  terceiros. Default de `utplsql.discovery.languageIds`:
  **`["plsql", "sql", "oracle-sql"]`**, com as extensões resolvidas
  dinamicamente em `vscode.extensions.all` + `files.associations`. Quem quiser
  evitar a varredura de `.sql` restringe para `["plsql"]`. `includePatterns`
  continua sendo a lista de globs adicionais; CodeLens/watcher usam o conjunto
  efetivo (glob + language ID, sem duplicar).
- **PRD-105 — snippets:** registrar para **`sql` e `plsql`**; incluir o skeleton
  de pacote **`ut-suite`** além das annotations/matchers. `oracle-sql` fica fora
  de `contributes.snippets` (language ID não contribuído gera warning no VS
  Code), mas continua aceito na descoberta/CodeLens. O JSON é validado no CI.
- **PRD-108 — HTML de cobertura:** gravar em **`test-results/coverage.html`** no
  workspace (root da suíte executada; fallback para temp do SO sem workspace),
  com `.gitignore`/`.vscodeignore`, escrita atômica e limpeza do alvo no início
  do run. Oferecer **Abrir no navegador** e **Salvar como…** sempre, de forma
  fire-and-forget depois do `run.end()`; nunca renderizar em webview.

## Fluxo de execução (por PRD)

1. `status: approved → in-progress` no frontmatter → `npm run brain:sync && npm run brain:build` + `npm run sync-prds`.
2. Implementar com TDD; manter cobertura ≥ thresholds do `.c8rc`.
3. Ao concluir: `status: completed` + `versao: "0.17.0"`; criar as regras
   `BR-*`/`SEC-*` e rodar `npm run brain:rules`; entry no `CHANGELOG.md`.
4. `npm run brain:ci` + `npm run docs:check` antes de cada PR.

## Relacionado

- [[MOC - PRDs]]
- [[Roadmap - 0.16.0 (execução)]] · [[Roadmap - 0.18.0 (planejamento)]]
