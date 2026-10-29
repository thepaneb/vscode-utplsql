---
id: BR-TEST-003
aliases: [BR-TEST-003]
tipo: regra
titulo: Stub de vscode é tipado e coberto pelo inventário de APIs
dominio: teste
status: ativo
severidade: media
interno: true
fonte: codigo
verificado: 2026-10-29
implementacao: ["src/test/vscode-stub.ts", "src/test/fixtures.ts", "src/test/vscode-stub.types.ts"]
testes: ["src/test/unit/anyBudget.test.ts", "src/test/unit/vscodeApiInventory.test.ts", "src/test/unit/oracleRunner.test.ts", "src/test/unit/results.test.ts", "src/test/unit/runner.test.ts"]
prds: ["PRD-114"]
requisitos: ["PRD-114/RF1", "PRD-114/RF2", "PRD-114/RF3"]
tags: ["teste", "vscode"]
---
## Enunciado

O stub de `vscode` usado pelos testes unitários é **estruturalmente compatível
com `@types/vscode`** no ponto de uso do produto: `TestItem`, `TestRun`,
`Position`, `Range`, `Location`, `TestMessage` e `TestItemCollection` declaram
`implements`; `FileCoverage`/`StatementCoverage`/`DeclarationCoverage` e `Uri`
são checados por `vscode-stub.types.ts`. O `vscodeApiInventory` falha se uma API
de **runtime** usada em `src/**` não existir no stub, e o orçamento de `any` em
`src/test/**` não pode regredir (atual: 116 `as any`; meta ≤178).

## Pré-condições

`@types/vscode` pinado; `src/test/unit/setup.ts` resolve `vscode` para o stub.

## Exceções

Namespaces pesados (`window`, `workspace`, `TextEditor`) permanecem estruturais
mínimos; os membros usados são verificados pelo inventário. Classes de
`@types/vscode` com membros privados não podem ser `implements` — nesses casos a
compatibilidade é checada por `Pick` no `vscode-stub.types.ts`.

## Justificativa

O stub é um ativo crítico: se divergir da API real, os testes passam e a
extensão quebra no Extension Host. Tipar + inventário + orçamento de `any`
torna essa divergência um erro de `tsc`/teste, não um bug de integração.

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - Regras]]
- 📄 PRDs: [[prd-114-vscode-stub-modernization|PRD-114]]
- 🎯 Requisitos: [[prd-114-vscode-stub-modernization|PRD-114 RF1]] · [[prd-114-vscode-stub-modernization|PRD-114 RF2]] · [[prd-114-vscode-stub-modernization|PRD-114 RF3]]
- 🧩 Código: [[COD - vscode-stub.ts]] · [[COD - fixtures.ts]] · [[COD - vscode-stub.types.ts]]
- 🧪 Testes: [[TST - anyBudget.test.ts]] · [[TST - vscodeApiInventory.test.ts]] · [[TST - oracleRunner.test.ts]] · [[TST - results.test.ts]] · [[TST - runner.test.ts]]
- ↩️ Referenciada por: [[Contributing]] · [[prd-114-vscode-stub-modernization|PRD-114]]
<!-- brain:auto:end -->
