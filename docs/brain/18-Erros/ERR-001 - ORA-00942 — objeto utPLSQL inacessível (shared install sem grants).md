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

Falha ao ler UT_RUNNER/buffer ou ao consultar ALL_SOURCE/ALL_SYNONYMS; no shared install o schema não enxerga os objetos UT3.

## Causa

Instalação compartilhada do utPLSQL sem grants para o schema do usuário, ou synonym ausente; a extensão não tem privilégio de leitura nos objetos do framework.

## Correção

Conceder os grants necessários ao schema (o comando utplsql.copyGrantsToClipboard ajuda) ou instalar o utPLSQL no próprio schema; a descoberta por banco degrada para o fallback e segue sem derrubar a extensão.

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - Erros]]
- 📐 Regras: [[BR-PARSE-007 - Fallback ALL_OBJECTS-ALL_SOURCE ignora UT_- e nunca lança|BR-PARSE-007]]
- 🧩 Código: [[COD - discovery.ts]] · [[COD - quickfix.ts]]
<!-- brain:auto:end -->
