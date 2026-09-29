---
id: BR-DEBUG-001
aliases: [BR-DEBUG-001]
tipo: regra
titulo: Ciclo do debugger DBMS_DEBUG para no breakpoint, lê o frame e encerra
dominio: debugger
status: ativo
severidade: alta
fonte: codigo
verificado: 2026-09-28
implementacao: ["src/debugger.ts:711", "src/dbmsDebug.ts:117", "src/dbmsDebug.ts:89"]
testes: ["src/test/integration/debuggerE2E.test.ts", "src/test/unit/debugger.test.ts", "src/test/unit/dbmsDebug.test.ts", "src/test/unit/debugger-liveRuntime.test.ts"]
prds: ["PRD-33", "PRD-71"]
tags: ["debugger"]
---
## Enunciado

`startDebugSession` abre a sessão com dois binds (`debug_info`/`debug_release`) e o
`DbmsDebugClient` comanda o ciclo real: `set_breakpoint` → `continue` → evento
(`reason_break`) → leitura de `dbms_debug.get_value` (frame/variável) → `continue`
final. Os targets de breakpoint são derivados de `parseBreakpointTarget`.

## Pré-condições

Banco com `DBMS_DEBUG` acessível; alvo em `schema.package.procedure` (ou
function/trigger, ver `BR-DEBUG-003`).

## Exceções

Evento de exceção é tratado por `BR-DEBUG-002`; sem alvo resolvido, a sessão não
inicia (nunca lança com stack suja).

## Justificativa

Garantir o fluxo completo breakpoint→stop→frame contra banco real (DBMS_DEBUG), que
é o contrato do depurador da extensão.

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - Regras]]
- 📄 PRDs: [[prd-33-plsql-debugger-integration|PRD-33]] · [[prd-71-debugger-dbms-debug-fix|PRD-71]]
- 🧩 Código: [[COD - debugger.ts]] · [[COD - dbmsDebug.ts]]
- 🧪 Testes: [[TST - debuggerE2E.test.ts]] · [[TST - debugger.test.ts]] · [[TST - dbmsDebug.test.ts]] · [[TST - debugger-liveRuntime.test.ts]]
- ↩️ Referenciada por: [[prd-33-plsql-debugger-integration|PRD-33]] · [[prd-71-debugger-dbms-debug-fix|PRD-71]]
<!-- brain:auto:end -->