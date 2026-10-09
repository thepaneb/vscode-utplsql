---
id: BR-UI-013
aliases: [BR-UI-013]
tipo: regra
titulo: Integração nativa ao Test Explorer via a API de testes do VS Code
dominio: ui
status: ativo
severidade: critica
interno: true
fonte: codigo
verificado: 2026-10-09
implementacao: ["src/extension.ts", "src/testTree.ts"]
testes: []
relacionado: ["[[ADR-009 - Integracao nativa ao Test Explorer]]", "[[TPL-VSCODE-TEST-API - VSCode Test API (Test Explorer)]]", "[[MOC - Testes]]"]
tags: ["ui"]
---
## Enunciado

A extensão expõe os testes pelo `vscode.tests.createTestController` (sem UI
própria). A árvore resolve **lazy por nível** (schema → package → suite → test) e
o `state.suiteMap` é o lookup canônico (no modo schema as suites ficam aninhadas
em 3 níveis). Resultados e cobertura vão para a API nativa
(`TestRun.passed/failed/errored/skipped`, `addCoverage`).

## Pré-condições

`engines.vscode`; `vscode.tests` disponível.

## Exceções

`controller.items.get()` não alcança itens no modo schema — usar
`state.getSuiteItem()` (ver BR-SCHEMA-001).

## Justificativa

Integração nativa dá Test Explorer, jump-to-failure e cobertura sem reinventar a
UI (ADR-009).

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - Regras]]
- 🧩 Código: [[COD - extension.ts]] · [[COD - testTree.ts]]
- 🔗 [[ADR-009 - Integracao nativa ao Test Explorer]] · [[TPL-VSCODE-TEST-API - VSCode Test API (Test Explorer)]] · [[MOC - Testes]]
- ↩️ Referenciada por: [[05-ux-components]] · [[TPL-VSCODE-TEST-API - VSCode Test API (Test Explorer)|TPL-VSCODE-TEST-API]]
<!-- brain:auto:end -->
