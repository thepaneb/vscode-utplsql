---
id: BR-CONN-016
aliases: [BR-CONN-016]
tipo: regra
titulo: Settings de conexão têm escopo machine e a extensão exige workspace confiável
dominio: conexao
status: ativo
severidade: alta
fonte: codigo
verificado: 2026-09-28
implementacao: ["package.json:54", "package.json:114", "package.json:285", "package.json:41"]
testes: ["src/test/unit/manifestDebugger.test.ts"]
prds: ["PRD-81"]
requisitos: ["PRD-81/RF1", "PRD-81/RF2"]
tags: ["conexao", "seguranca"]
---
## Enunciado

As settings de conexão (`utplsql.connection`, `utplsql.profiles`, `utplsql.activeProfile`, `utplsql.oracleClientLibDir`, `utplsql.oracleClientConfigDir`, `utplsql.connections.tnsAdminPath`) são `scope: machine` — não podem ser sobrescritas por `.vscode/settings.json`. A extensão declara `capabilities.untrustedWorkspaces.supported: false` e fica desabilitada em workspaces não confiáveis.

## Pré-condições

Manifesto `package.json` validado pelo VSCode.

## Exceções

Settings de comportamento (timeout, organization, codeLens, scriptRunner, debugger, i18n etc.) permanecem com escopo de janela/workspace.

## Justificativa

Um `.vscode/settings.json` de origem não confiável poderia redirecionar a conexão do perfil — e a senha guardada no SecretStorage — para outro host. Escopo `machine` + `untrustedWorkspaces` fecham esse vetor.

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - Regras]]
- 📄 PRDs: [[prd-81-security-hardening|PRD-81]]
- 🎯 Requisitos: [[prd-81-security-hardening|PRD-81 RF1]] · [[prd-81-security-hardening|PRD-81 RF2]]
- 🧩 Código: [[COD - package.json]]
- 🧪 Testes: [[TST - manifestDebugger.test.ts]]
- ↩️ Referenciada por: [[Connection]] · [[SEC-011 - Settings de conexão não são sobrescrevíveis por workspace|SEC-011]] · [[prd-81-security-hardening|PRD-81]]
<!-- brain:auto:end -->
