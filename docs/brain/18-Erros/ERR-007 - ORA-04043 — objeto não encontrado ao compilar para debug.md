---
id: ERR-007
aliases: [ERR-007]
tipo: erro
titulo: ORA-04043 — objeto não encontrado ao compilar para debug
dominio: debug
codigo: ORA-04043
status: ativo
severidade: media
verificado: 2026-09-23
implementacao: ["src/compileForDebug.ts:70"]
testes: []
regras: []
relacionado: ["[[ADR-012 - Debugger PLSQL via DBMS_DEBUG e DAP]]", "[[11-debugger]]"]
tags: [erros, debug]
---
## Sintoma

A compilação para debug falha porque o objeto/pacote não existe no banco.

## Causa

O package alvo do debug ainda não foi criado no schema (ou nome difere), então o ALTER/COMPILE não encontra o objeto.

## Correção

Compilar/instalar o package no banco antes de depurar; a extensão detecta ORA-04043 (errorNum 4043) e reporta a falha de forma amigável.

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - Erros]]
- 🧩 Código: [[COD - compileForDebug.ts]]
- 🔗 [[ADR-012 - Debugger PLSQL via DBMS_DEBUG e DAP]] · [[11-debugger]]
<!-- brain:auto:end -->
