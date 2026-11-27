---
id: ERR-001
aliases: [ERR-001]
tipo: erro
titulo: ORA-00942 — objeto utPLSQL inacessível (shared install sem grants)
dominio: conexao
codigo: ORA-00942
status: ativo
severidade: alta
verificado: 2026-09-23
implementacao: ["src/discovery.ts:189", "src/quickfix.ts:91"]
testes: []
regras: ["BR-PARSE-007"]
tags: [erros, conexao]
---
## Sintoma

Falha ao ler `UT_RUNNER`/buffer, ao consultar `ALL_SOURCE`/`ALL_SYNONYMS` ou, na cobertura, ao acessar `DBMSPCC_BLOCKS` no schema atual; no shared install o schema não enxerga os objetos do UT3.

## Causa

Instalação compartilhada do utPLSQL sem grants para o schema do usuário, ou synonym ausente. O erro de cobertura (`ORA-00942` em `<schema>.DBMSPCC_BLOCKS`) acontece porque os packages `UT_COVERAGE_*` usam `AUTHID CURRENT_USER` e referenciam `DBMSPCC_BLOCKS`/`DBMSPCC_RUNS`/`DBMSPCC_UNITS` sem schema; grant não cria synonym. Grants nas tabelas de buffer também são necessários para o runner.

## Correção

Conceder os grants necessários ao schema (o comando `utplsql.copyGrantsToClipboard` ajuda) **e** criar os synonyms no schema do usuário quando ele não tiver os públicos:
`UT`, `UT_RUNNER`, `UT_VARCHAR2_LIST`, `UT_REPORTERS`, `DBMSPCC_BLOCKS`, `DBMSPCC_RUNS`, `DBMSPCC_UNITS`. Para cobertura, manter também `GRANT EXECUTE ON SYS.DBMS_PROFILER` (e `DBMS_PLSQL_CODE_COVERAGE` em 12.2+). Alternativa: instalar o utPLSQL no próprio schema; a descoberta por banco degrada para o fallback e segue sem derrubar a extensão.

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - Erros]]
- 📐 Regras: [[BR-PARSE-007 - Fallback ALL_OBJECTS-ALL_SOURCE ignora UT_- e nunca lança|BR-PARSE-007]]
- 🧩 Código: [[COD - discovery.ts]] · [[COD - quickfix.ts]]
- ↩️ Referenciada por: [[BR-PARSE-007 - Fallback ALL_OBJECTS-ALL_SOURCE ignora UT_- e nunca lança|BR-PARSE-007]]
<!-- brain:auto:end -->
