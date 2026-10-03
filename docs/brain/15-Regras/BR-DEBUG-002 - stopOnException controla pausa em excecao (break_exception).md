---
id: BR-DEBUG-002
aliases: [BR-DEBUG-002]
tipo: regra
titulo: stopOnException controla pausa em exceção (break_exception)
dominio: debugger
status: ativo
severidade: alta
fonte: codigo
verificado: 2026-09-28
implementacao: ["src/debugger.ts:526", "src/debugger.ts:561", "src/debugger.ts:192"]
testes: ["src/test/integration/debuggerExceptionE2E.test.ts"]
prds: ["PRD-86"]
tags: ["debugger"]
---
## Enunciado

`stopOnException` (setting `utplsql.debugger.stopOnException`, default `true`) vira
o `breakOnException` passado a `continue`/`stepInto`/`stepOver`/`stepOut`. Com
`true`, uma exceção suspende em `reason_exception`; com `false`, o evento de exceção
é ignorado e a execução segue.

## Pré-condições

Sessão de debug ativa (`BR-DEBUG-001`).

## Exceções

Outros `reason` (`break`, `exiting`, `no_break`) não são afetados pelo valor.

## Justificativa

Permitir depurar o *caminho feliz* sem parar em exceções tratadas, mantendo o
comportamento clássico de parar na exceção quando pedido.

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - Regras]]
- 📄 PRDs: [[prd-86-debugger-stop-on-exception|PRD-86]]
- 🧩 Código: [[COD - debugger.ts]]
- 🧪 Testes: [[TST - debuggerExceptionE2E.test.ts]]
- ↩️ Referenciada por: [[ADR-012 - Debugger PLSQL via DBMS_DEBUG e DAP|ADR-012]] · [[Debugger]] · [[prd-86-debugger-stop-on-exception|PRD-86]]
<!-- brain:auto:end -->