---
tipo: decisao
status: aceita
modulo: debugger
data: 2026-09-23
tags: [adr, debugger, dbms_debug, dap]
---

# ADR-012 - Debugger PL/SQL via DBMS_DEBUG e DAP nativo

## Contexto

Depurar testes PL/SQL exige controle de sessão no banco (breakpoints, step, variáveis)
e integração com a UI do VSCode. Alternativas: (a) implementar um debugger próprio,
(b) usar o **Debug Adapter Protocol (DAP)** com um adapter que fala `DBMS_DEBUG`, ou
(c) depender de ferramenta externa (SQL Developer).

## Decisão

1. **DAP nativo** com um Debug Adapter próprio (`debugger.ts` + `dbmsDebug.ts`)
   que usa **`DBMS_DEBUG`** no banco.
2. **Compilar para debug** antes de depurar (`compileForDebug.ts` + comando/menus,
   PRD-73), recompilando o objeto com `DEBUG`.
3. **Corrigir o caminho real do `DBMS_DEBUG`** (PRD-71), após a integração inicial.

## Alternativas consideradas

- **Debugger próprio via comandos:** reinventa a UI de debug e perde breakpoints/
  variáveis/watch nativos do VSCode.
- **SQL Developer/ferramenta externa:** fricção de contexto; fora do editor.
- **Sem debug:** perde um diferencial de produtividade.

## Consequências

- **Positivas:** breakpoints/step/variáveis na UI nativa; debug dentro do editor.
- **Negativas / trade-offs:** exige grants e sessão dedicada no banco; precisa
  recompilar o objeto em modo debug; o fluxo é sensível a versão do banco.

## Referências

- PRDs: [[prd-33-plsql-debugger-integration|PRD-33]] ·
  [[prd-71-debugger-dbms-debug-fix|PRD-71]] ·
  [[prd-73-compile-for-debug|PRD-73]]
- Código: `src/debugger.ts`, `src/dbmsDebug.ts`, `src/compileForDebug.ts`
- [[MOC - Oracle]]
