---
id: BR-UI-009
aliases: [BR-UI-009]
tipo: regra
titulo: Handlers dos comandos utplsql.* são registrados e degradam com aviso
dominio: ui
status: ativo
severidade: media
fonte: codigo
verificado: 2026-09-29
implementacao: ["src/commands/connection.ts:11", "src/commands/debug.ts:71", "src/commands/deps.ts:7", "src/commands/profile.ts:18", "src/commands/script.ts:104"]
testes: ["src/test/unit/runCommands.test.ts", "src/test/unit/runCommandsExec.test.ts", "src/test/unit/scriptCommands.test.ts", "src/test/unit/scriptCommandsExec.test.ts", "src/test/unit/utilityCommands.test.ts", "src/test/unit/utilityCommandsDriverMissing.test.ts", "src/test/unit/debugCommands.test.ts", "src/test/unit/selectReporterCommand.test.ts", "src/test/integration/commandsE2E.test.ts"]
tags: ["ui", "comandos"]
---
## Enunciado

Os handlers de comando ficam agrupados por área (`commands/connection|debug|profile|
script|run|utility`), recebem as dependências pelo `CommandDeps` e são registrados
em `extension.ts`. Cada handler valida o contexto (editor ativo, perfis salvos,
alvo do cursor) e **avisa** com mensagem amigável quando o pré-requisito falta —
nunca lança. A falta do driver `oracledb` também vira aviso.

## Pré-condições

Extensão ativa (`BR-UI-001`); para comandos que executam, conexão/arquivo válidos.

## Exceções

`utplsql.manageProfiles` apenas abre as settings; comandos de debug dependem do
`BR-DEBUG-*`.

## Justificativa

Manter a Command Palette e os menus previsíveis: todo `utplsql.*` do manifesto tem
handler, e entrada inválida produz aviso (não erro não tratado).

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - Regras]]
- 🧩 Código: [[COD - connection.ts]] · [[COD - debug.ts]] · [[COD - deps.ts]] · [[COD - profile.ts]] · [[COD - script.ts]]
- 🧪 Testes: [[TST - runCommands.test.ts]] · [[TST - runCommandsExec.test.ts]] · [[TST - scriptCommands.test.ts]] · [[TST - scriptCommandsExec.test.ts]] · [[TST - utilityCommands.test.ts]] · [[TST - utilityCommandsDriverMissing.test.ts]] · [[TST - debugCommands.test.ts]] · [[TST - selectReporterCommand.test.ts]] · [[TST - commandsE2E.test.ts]]
- ↩️ Referenciada por: [[prd-51-run-by-tag|PRD-51]] · [[prd-53-debug-test-variants|PRD-53]]
<!-- brain:auto:end -->