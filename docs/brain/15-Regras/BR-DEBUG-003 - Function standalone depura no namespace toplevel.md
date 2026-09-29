---
id: BR-DEBUG-003
aliases: [BR-DEBUG-003]
tipo: regra
titulo: Function standalone depura no namespace toplevel
dominio: debugger
status: ativo
severidade: media
fonte: codigo
verificado: 2026-09-28
implementacao: ["src/dbmsDebug.ts:30", "src/dbmsDebug.ts:72", "src/dbmsDebug.ts:89"]
testes: ["src/test/integration/debuggerStandaloneFn.test.ts"]
prds: ["PRD-33"]
tags: ["debugger"]
---
## Enunciado

O namespace do breakpoint é escolhido por `namespacesForExt`/`parseBreakpointTarget`:
pacote (`pks`/`pkb`) usa `pkg_body`; function/procedure/trigger standalone usa
`toplevel`. Assim uma function fora de package também para no breakpoint e lê o frame.

## Pré-condições

Arquivo standalone (`.fnc`/`.prc`/`.trg`) com o procedimento alvo.

## Exceções

Sem extensão reconhecida, cai no namespace default do parse (mesma matriz do
`BR-PARSE-002`).

## Justificativa

Cobrir o caso que o Debug Console do VSCode também suporta — função avulsa, não só
método de package.

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - Regras]]
- 📄 PRDs: [[prd-33-plsql-debugger-integration|PRD-33]]
- 🧩 Código: [[COD - dbmsDebug.ts]]
- 🧪 Testes: [[TST - debuggerStandaloneFn.test.ts]]
- ↩️ Referenciada por: [[prd-33-plsql-debugger-integration|PRD-33]]
<!-- brain:auto:end -->