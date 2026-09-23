---
id: BR-UI-003
tipo: regra
titulo: utplsql:connected reflete a resolução de conexão sem prompt
dominio: ui
status: ativo
severidade: alta
fonte: codigo
verificado: 2026-09-23
implementacao: ["src/config.ts:171", "src/config.ts:174", "src/config.ts:182", "src/config.ts:187", "src/config.ts:191", "src/config.ts:218", "src/config.ts:226"]
testes: ["src/test/unit/config.test.ts"]
prds: ["PRD-27", "PRD-34"]
requisitos: ["PRD-27/RF4"]
tags: ["ui", "conexao"]
---
## Enunciado

utplsql:connected é setado true sempre que a conexão é resolvida por qualquer fonte (perfil ativo, setting utplsql.connection, env UTPLSQL_CONN ou cache de sessão) ou quando o usuário digita a conexão; vira false apenas em clearSessionConnection.

## Pré-condições

Chamada a resolveConnectionNoPrompt/resolveConnection com ao menos uma fonte de conexão disponível.

## Exceções

Se nenhuma fonte existir, o context key permanece no estado anterior (não é explicitamente setado false).

## Justificativa

Keybindings de run usam when utplsql:connected; conexões via perfil/env precisam habilitá-los sem prompt.

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - Regras]]
- 📄 PRDs: [[prd-27-default-keybindings|PRD-27]] · [[prd-34-multi-connection-profiles|PRD-34]]
- 🎯 Requisitos: [[prd-27-default-keybindings|PRD-27 RF4]]
- ↩️ Referenciada por: [[05-ux-components]] · [[09-configuration]]
<!-- brain:auto:end -->
