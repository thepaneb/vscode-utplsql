---
tipo: decisao
id: ADR-009
aliases: [ADR-009]
status: aceita
modulo: ux
data: 2026-09-23
tags: [adr, ux, test-explorer, codelens]
---

# ADR-009 - Integração nativa ao Test Explorer (CodeLens, status bar, decorações)

## Contexto

O usuário precisa rodar testes e ver resultados sem sair do editor. Havia a
alternativa de uma view própria, mas o VSCode já oferece a **Testing API** com
árvore, progresso, resultados e navegação nativos.

## Decisão

1. **Adotar a Testing API nativa** (`vscode.TestController`), com árvore de
   suites/testes, run profiles e resultados por item.
2. **CodeLens** sobre `%suite`/`%test` (`Run`/`Run with Coverage`) — parse em
   `src/codelens.ts` (`parseCodeLensItems`), registrado em `**/*.pks` **sem**
   `language: 'plsql'` (o `.pks` não tem language ID padrão).
3. **Status bar** com contagem pass/fail e duração; **decorações inline** ✓/✗/⚠ no
   editor; **smart re-run** (Rerun Last, Run at Cursor, Run Failed Only) e
   **jump to failure** via `message.location`.
4. **Quick-fix** de setup (Problems Panel) e **diagnostics** de compilação PL/SQL.

## Alternativas consideradas

- **View/árvore própria (webview):** reinventa a Testing API e perde integração
  (gutter de teste, "Go to Error", filtros nativos).
- **Só comandos de paleta:** menos descobrível; sem feedback inline.

## Consequências

- **Positivas:** integração nativa (árvore, progresso, navegação); resultados no
  editor; re-run rápido.
- **Negativas / trade-offs:** `parseCodeLensItems` é compartilhado por 3 lugares
  (CodeLens, decorações, Run at Cursor); no modo schema a árvore tem 3 níveis
  (usar `state.getSuiteItem()`).

## Referências

- PRDs: [[prd-24-codelens-integration|PRD-24]] ·
  [[prd-25-status-bar-indicator|PRD-25]] ·
  [[prd-26-inline-test-decorations|PRD-26]] ·
  [[prd-27-default-keybindings|PRD-27]] ·
  [[prd-31-smart-rerun-patterns|PRD-31]] ·
  [[prd-32-quickfix-setup-diagnostics|PRD-32]]
- Código: `src/codelens.ts`, `src/statusBar.ts`, `src/decorations.ts`,
  `src/quickfix.ts`
- [[TPL-VSCODE-TEST-API - VSCode Test API (Test Explorer)]]
