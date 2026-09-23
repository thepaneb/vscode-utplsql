---
tipo: decisao
status: aceita
modulo: testes
data: 2026-09-23
tags: [adr, testes, arquitetura, c8]
---

# ADR-006 - Módulos puros vs dependentes de vscode

## Contexto

A API do VSCode só existe no Extension Host, o que torna difícil testar lógica de
negócio com `node --test`. Precisávamos de testes rápidos e de cobertura TypeScript
(`c8`) sem subir o host.

## Decisão

1. **Separar módulos puros** (sem `import 'vscode'`) dos que dependem do host:
   `suiteParser`, `junit`, `cobertura`, `matching`, `i18n`, `codelens` (parse),
   `state`, `types`, `scriptRunner`, `plsqlDeclarations`, `dbmsDebug`.
2. **Stub de vscode em duas camadas** para os módulos de produção testados
   (`src/test/vscode-stub.ts` + `--require scripts/test-setup.cjs`).
3. **Cobertura TypeScript com `c8`** sobre source maps (`out/*.js` → `src/*.ts`),
   com thresholds no `.c8rc`.

## Alternativas consideradas

- **Testar tudo via `@vscode/test-electron`:** fiel, porém lento e sem cobertura
  TypeScript prática.
- **Mockar `vscode` globalmente:** quebra o tree-shaking e esconde dependências
  reais do host.
- **Não medir cobertura TS:** sem rede de segurança para refactors.

## Consequências

- **Positivas:** maioria da lógica testável com `node --test`; cobertura TS com
  thresholds; refactors seguros.
- **Negativas / trade-offs:** exige disciplina de fronteira (um `import 'vscode'`
  num módulo "puro" quebra o teste); stub precisa acompanhar a API usada; dois
  níveis de setup de teste.

## Referências

- PRDs: [[prd-44-pure-matching|PRD-44]] ·
  [[prd-37-ts-coverage|PRD-37]] ·
  [[prd-04-expand-tests|PRD-04]]
- Código: `src/test/vscode-stub.ts`, `scripts/test-setup.cjs`, `.c8rc`
- [[PAT-001 - Módulos puros vs dependentes de vscode]] ·
  [[PAT-007 - Stub de vscode em duas camadas]]
