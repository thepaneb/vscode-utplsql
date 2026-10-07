---
id: BR-DEBUG-004
aliases: [BR-DEBUG-004]
tipo: regra
titulo: compileForDebug recompila com debug e mantém o objeto VALID
dominio: debugger
status: ativo
severidade: media
fonte: codigo
verificado: 2026-09-28
implementacao: ["src/compileForDebug.ts:58", "src/compileForDebug.ts:94", "src/compileForDebug.ts:128", "src/compileForDebug.ts:30"]
testes: ["src/test/integration/compileForDebug.test.ts", "src/test/unit/compileForDebug.test.ts", "src/test/unit/compileForDebugPool.test.ts"]
prds: ["PRD-73"]
tags: ["debugger"]
---
## Enunciado

`compileForDebug` deriva o alvo do arquivo (`debuggableFromFile`: package/function/
procedure/trigger), emite `ALTER ... COMPILE DEBUG` via `compileForDebugSql`
(identificadores validados por `isValidOracleIdentifier` — sem injeção) e, após
compilar, confirma que o objeto permanece **VALID**; erro de compilação é reportado.

## Pré-condições

Arquivo PL/SQL com cabeçalho reconhecível (`%suite`/CREATE) e conexão resolvida.

## Exceções

Arquivo não depurável (sem procedure/function no corpo) → alvo indefinido, sem
execução (não lança).

## Justificativa

Necessário porque o VSCode não compila o objeto com informação de debug — sem isso o
breakpoint não resolve (`BR-DEBUG-001`).

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - Regras]]
- 📄 PRDs: [[prd-73-compile-for-debug|PRD-73]]
- 🧩 Código: [[COD - compileForDebug.ts]]
- 🧪 Testes: [[TST - integration-compileForDebug.test.ts]] · [[TST - unit-compileForDebug.test.ts]] · [[TST - compileForDebugPool.test.ts]]
- ↩️ Referenciada por: [[Debugger]] · [[ERR-007 - ORA-04043 — objeto não encontrado ao compilar para debug|ERR-007]] · [[prd-53-debug-test-variants|PRD-53]] · [[prd-73-compile-for-debug|PRD-73]]
<!-- brain:auto:end -->