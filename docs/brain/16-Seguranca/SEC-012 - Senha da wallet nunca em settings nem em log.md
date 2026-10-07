---
id: SEC-012
aliases: [SEC-012]
tipo: seguranca
titulo: Senha da wallet nunca fica em settings nem em log
dominio: segredos
status: ativo
severidade: alta
verificado: 2026-09-28
implementacao: ["src/connectionProfiles.ts:281", "src/connectionProfiles.ts:287", "src/oracleRunner.ts:116"]
testes: ["src/test/unit/connectionProfiles.test.ts", "src/test/unit/profileCommands.test.ts"]
regras: ["BR-CONN-017"]
prds: ["PRD-82"]
requisitos: ["PRD-82/RNF2"]
tags: ["seguranca", "conexao"]
---
## Enunciado

A senha da wallet só existe no SecretStorage (`utplsql.wallet.<profileId>`) e no cache em memória; nunca é gravada em `settings.json` nem impressa em mensagens/logs.

## Controle

`setWalletPassword`/`clearWalletPassword` usam `secretStorage.store`/`delete`; o comando usa `showInputBox({ password: true })`; mensagens de sucesso citam apenas o nome do perfil.

## Justificativa

Mesma razão da SEC-001, aplicada à credencial de wallet.

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - Seguranca]]
- 📄 PRDs: [[prd-82-tns-wallet|PRD-82]]
- 📐 Regras: [[BR-CONN-017 - Senha da wallet vai para o SecretStorage e ao pool|BR-CONN-017]]
- 🎯 Requisitos: [[prd-82-tns-wallet|PRD-82 RNF2]]
- 🧩 Código: [[COD - connectionProfiles.ts]] · [[COD - oracleRunner.ts]]
- 🧪 Testes: [[TST - connectionProfiles.test.ts]] · [[TST - profileCommands.test.ts]]
- ↩️ Referenciada por: [[prd-82-tns-wallet|PRD-82]]
<!-- brain:auto:end -->
