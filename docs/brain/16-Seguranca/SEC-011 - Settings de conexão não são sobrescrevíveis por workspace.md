---
id: SEC-011
aliases: [SEC-011]
tipo: seguranca
titulo: Settings de conexão não são sobrescrevíveis por workspace
dominio: segredos
status: ativo
severidade: alta
verificado: 2026-09-28
implementacao: ["package.json:54", "package.json:285", "package.json:41"]
testes: ["src/test/unit/manifestDebugger.test.ts"]
regras: ["BR-CONN-016"]
prds: ["PRD-81"]
tags: ["seguranca", "conexao"]
---
## Enunciado

As settings de conexão são `scope: machine` e a extensão está desabilitada em workspaces não confiáveis; portanto um `.vscode/settings.json` de terceiros não pode apontar a conexão (nem a senha do SecretStorage) para outro host.

## Controle

`package.json`: `"scope": "machine"` em `utplsql.connection`/`profiles`/`activeProfile`/`oracleClientLibDir`/`oracleClientConfigDir`/`connections.tnsAdminPath`; `capabilities.untrustedWorkspaces.supported: false`.

## Justificativa

Fechar o vetor de exfiltração de credencial via configuração de workspace.

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - Seguranca]]
- 📄 PRDs: [[prd-81-security-hardening|PRD-81]]
- 📐 Regras: [[BR-CONN-016 - Settings de conexão machine-scoped e workspace confiável|BR-CONN-016]]
- 🧩 Código: [[COD - package.json]]
- 🧪 Testes: [[TST - manifestDebugger.test.ts]]
- ↩️ Referenciada por: [[prd-81-security-hardening|PRD-81]]
<!-- brain:auto:end -->
