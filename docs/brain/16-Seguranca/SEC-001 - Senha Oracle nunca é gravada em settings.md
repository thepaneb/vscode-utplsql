---
id: SEC-001
aliases: [SEC-001]
tipo: seguranca
titulo: Senha Oracle nunca é gravada em settings
dominio: segredos
status: ativo
severidade: critica
verificado: 2026-09-28
implementacao: ["src/connectionProfiles.ts:120", "src/connectionProfiles.ts:222", "src/connectionProfiles.ts:234"]
testes: ["src/test/unit/connectionProfiles.test.ts"]
regras: ["BR-CONN-005", "BR-CONN-007"]
tags: ["seguranca", "conexao"]
---
## Enunciado

A senha do perfil Oracle nunca é persistida em utplsql.profiles; ao salvar, ela é extraída e gravada no SecretStorage (keychain do VSCode) sob utplsql.profile.<id>, e a settings fica sem a senha.

## Controle

saveProfiles chama splitPassword + persistPassword (segredo JSON `{connection, password}`); migrateLegacyProfiles converge instalações antigas; getProfileConnection recompõe a senha só quando o vínculo de conexão bate (PRD-81 RF3). As settings de conexão são `scope: machine`, não sobrescrevíveis por workspace.

## Justificativa

Settings podem ser sincronizadas (Settings Sync) e versionadas; segredo em texto plano vazaria para fora da máquina.

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - Seguranca]]
- 📐 Regras: [[BR-CONN-005 - Senha do perfil vai para o SecretStorage ao salvar|BR-CONN-005]] · [[BR-CONN-007 - Migração de perfis legados é idempotente|BR-CONN-007]]
- 🧩 Código: [[COD - connectionProfiles.ts]]
- 🧪 Testes: [[TST - connectionProfiles.test.ts]]
<!-- brain:auto:end -->
