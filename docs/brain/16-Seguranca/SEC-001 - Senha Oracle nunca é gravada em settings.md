---
id: SEC-001
tipo: seguranca
titulo: Senha Oracle nunca é gravada em settings
dominio: segredos
status: ativo
severidade: critica
verificado: 2026-09-23
implementacao: ["src/connectionProfiles.ts:111", "src/connectionProfiles.ts:126", "src/connectionProfiles.ts:186"]
testes: ["src/test/unit/connectionProfiles.test.ts"]
regras: ["BR-CONN-005", "BR-CONN-007"]
tags: ["seguranca", "conexao"]
---
## Enunciado

A senha do perfil Oracle nunca é persistida em utplsql.profiles; ao salvar, ela é extraída e gravada no SecretStorage (keychain do VSCode) sob utplsql.profile.<id>, e a settings fica sem a senha.

## Controle

saveProfiles chama splitPassword + persistPassword; migrateLegacyProfiles converge instalações antigas; getProfileConnection recompõe a senha a partir do cache/secret.

## Justificativa

Settings podem ser sincronizadas (Settings Sync) e versionadas; segredo em texto plano vazaria para fora da máquina.

