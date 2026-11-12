---
id: SEC-012
aliases: [SEC-012]
tipo: seguranca
titulo: Senha da wallet é vinculada à connection e nunca fica em settings/log
dominio: segredos
status: ativo
severidade: alta
verificado: 2026-11-11
implementacao: ["src/connectionProfiles.ts", "src/oracleRunner.ts"]
testes: ["src/test/unit/connectionProfiles.test.ts", "src/test/unit/profileCommands.test.ts", "src/test/integration/v021-features.test.ts"]
regras: ["BR-CONN-017"]
prds: ["PRD-82", "PRD-137"]
requisitos: ["PRD-82/RNF2", "PRD-137/RNF1", "PRD-137/RNF2"]
tags: ["seguranca", "conexao"]
---
## Enunciado

A senha da wallet só existe no SecretStorage (`utplsql.wallet.<profileId>`) e no cache em memória; nunca é gravada em `settings.json` nem impressa em mensagens/logs. O segredo carrega a `connection` do perfil e só é reaproveitado quando ela continua a mesma (PRD-137).

## Controle

`setWalletPassword`/`clearWalletPassword` usam `secretStorage.store`/`delete`; o comando usa `showInputBox({ password: true })`; mensagens de sucesso citam apenas o nome do perfil. Na hidratação, um vínculo divergente apaga o segredo e registra um warning; o formato legado (string crua) é migrado na primeira leitura.

## Justificativa

Mesma razão da SEC-001, aplicada à credencial de wallet.

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - Seguranca]]
- 📄 PRDs: [[prd-82-tns-wallet|PRD-82]] · [[prd-137-wallet-password-binding|PRD-137]]
- 📐 Regras: [[BR-CONN-017 - Senha da wallet vai para o SecretStorage e ao pool|BR-CONN-017]]
- 🎯 Requisitos: [[prd-82-tns-wallet|PRD-82 RNF2]] · [[prd-137-wallet-password-binding|PRD-137 RNF1]] · [[prd-137-wallet-password-binding|PRD-137 RNF2]]
- 🧩 Código: [[COD - connectionProfiles.ts]] · [[COD - oracleRunner.ts]]
- 🧪 Testes: [[TST - connectionProfiles.test.ts]] · [[TST - profileCommands.test.ts]] · [[TST - v021-features.test.ts]]
- ↩️ Referenciada por: [[prd-137-wallet-password-binding|PRD-137]] · [[prd-82-tns-wallet|PRD-82]]
<!-- brain:auto:end -->
