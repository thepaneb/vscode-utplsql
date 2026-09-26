---
id: SEC-005
aliases: [SEC-005]
tipo: seguranca
titulo: Nenhum valor de usuário é concatenado no PL/SQL
dominio: injecao
status: ativo
severidade: critica
verificado: 2026-09-23
implementacao: ["src/oracleRunner.ts:593", "src/oracleRunner.ts:596", "src/oracleRunner.ts:604"]
testes: ["src/test/unit/oracleRunner.test.ts"]
regras: ["BR-EXEC-012"]
tags: ["seguranca", "injecao"]
---
## Enunciado

Parâmetros do run (paths, tags, coverage, escopo) entram sempre como binds tipados; listas vazias viram o literal null, sem interpolação de texto.

## Controle

Montagem do BEGIN ut_runner.run(...) usa binds UT_VARCHAR2_LIST/STRING/NUMBER/BOOLEAN.

## Justificativa

Evita injeção de SQL/PL-SQL a partir de settings do workspace.

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - Seguranca]]
- 📐 Regras: [[BR-EXEC-012 - Binds tipados - nenhum valor de usuário concatenado no PL-SQL|BR-EXEC-012]]
- 🧩 Código: [[COD - oracleRunner.ts]]
- 🧪 Testes: [[TST - oracleRunner.test.ts]]
<!-- brain:auto:end -->
