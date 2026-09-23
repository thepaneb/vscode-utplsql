---
id: BR-UI-001
tipo: regra
titulo: Context key utplsql:activated é setado na ativação
dominio: ui
status: ativo
severidade: media
fonte: codigo
verificado: 2026-09-23
implementacao: ["src/extension.ts:32", "package.json:36"]
testes: ["src/test/integration/extension.test.ts"]
prds: ["PRD-27"]
requisitos: ["PRD-27/RF4"]
tags: ["ui"]
---
## Enunciado

Ao ativar a extensão, o context key utplsql:activated é setado para true imediatamente, antes de qualquer outra inicialização, habilitando keybindings e menus básicos mesmo sem conexão.

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
<!-- brain:auto:end -->
