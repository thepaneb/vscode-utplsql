---
id: BR-UI-002
tipo: regra
titulo: utplsql:running liga no início e desliga em todos os caminhos de saída
dominio: ui
status: ativo
severidade: alta
fonte: codigo
verificado: 2026-09-23
implementacao: ["src/runner.ts:141", "src/runner.ts:161", "src/runner.ts:221", "package.json:624"]
testes: ["src/test/unit/runner.test.ts"]
prds: ["PRD-05"]
requisitos: ["PRD-27/RF4"]
tags: ["ui"]
---
## Enunciado

utplsql:running vira true imediatamente antes da execução e volta a false em todos os caminhos de saída: quando não há testes (early return), no fim normal do run e após o bloco de erro do Oracle.

## Pré-condições

Execução iniciada com workspace e conexão resolvidos (senão retorna antes de setar running).

## Exceções

Se faltar pasta aberta ou conexão, utplsql:running nunca é setado; retorno com mensagem de erro.

## Justificativa

O keybinding Escape só cancela a execução enquanto utplsql:running estiver ativo; deve ser sempre resetado.

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - Regras]]
- 📄 PRDs: [[prd-05-progress-cancel|PRD-05]]
- 🎯 Requisitos: [[prd-27-default-keybindings|PRD-27 RF4]]
<!-- brain:auto:end -->
