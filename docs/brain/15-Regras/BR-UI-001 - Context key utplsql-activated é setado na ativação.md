---
id: BR-UI-001
aliases: [BR-UI-001]
tipo: regra
titulo: Context key utplsql:activated é setado na ativação
dominio: ui
status: ativo
severidade: media
fonte: codigo
verificado: 2026-09-23
implementacao: ["src/extension.ts:38", "package.json:37", "package.json:38", "package.json:40"]
testes: ["src/test/integration/extension.test.ts", "src/test/unit/extensionActivation.test.ts", "src/test/unit/manifestDebugger.test.ts"]
prds: ["PRD-27"]
requisitos: ["PRD-27/RF4"]
interno: true
tags: ["ui"]
---
## Enunciado

Ao ativar a extensão, o context key utplsql:activated é setado para true imediatamente, antes de qualquer outra inicialização, habilitando keybindings e menus básicos mesmo sem conexão.

A ativação cobre `onStartupFinished` (necessário no modo `schema`/DB-first, em que
o workspace pode não ter `.pks` local) e `workspaceContains` para
`.pks`/`.pkb`/`.sql`; comandos `utPLSQL:*` também ativam sob demanda.

## Pré-condições

Extensão ativada (activationEvents workspaceContains de .pks ou .pkb).

## Exceções

Nenhuma; é a primeira instrução de activate.

## Justificativa

Keybindings como refresh/info/clearConnection usam when utplsql:activated e precisam existir desde o start.

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - Regras]]
- 📄 PRDs: [[prd-27-default-keybindings|PRD-27]]
- 🎯 Requisitos: [[prd-27-default-keybindings|PRD-27 RF4]]
- 🧩 Código: [[COD - extension.ts]] · [[COD - package.json]]
- 🧪 Testes: [[TST - extension.test.ts]] · [[TST - extensionActivation.test.ts]] · [[TST - manifestDebugger.test.ts]]
- ↩️ Referenciada por: [[05-ux-components]] · [[prd-27-default-keybindings|PRD-27]]
<!-- brain:auto:end -->
