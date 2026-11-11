---
id: BR-CONN-017
aliases: [BR-CONN-017]
tipo: regra
titulo: Senha da wallet vai para o SecretStorage e é propagada ao pool
dominio: conexao
status: ativo
severidade: alta
fonte: codigo
verificado: 2026-11-11
implementacao: ["src/connectionProfiles.ts", "src/oracleRunner.ts", "src/types.ts"]
testes: ["src/test/unit/connectionProfiles.test.ts", "src/test/unit/oracleRunner.test.ts", "src/test/integration/prd015ExtraE2E.test.ts"]
prds: ["PRD-82", "PRD-137"]
requisitos: ["PRD-82/RF4", "PRD-137/RF1", "PRD-137/RF2"]
tags: ["conexao", "seguranca"]
---
## Enunciado

A senha da wallet Oracle Cloud é gravada no SecretStorage sob `utplsql.wallet.<profileId>` (comando `utPLSQL: Set wallet password`; entrada vazia limpa) no formato `{ connection, password }`, vinculada à connection do perfil (PRD-137). O pool passa `walletLocation` e `walletPassword` ao `createPool` somente quando definidos; `walletLocation` fica no perfil.

## Pré-condições

Perfil ativo com `walletLocation`; SecretStorage inicializado.

## Exceções

Sem `walletLocation`/senha, o `createPool` não recebe os campos (comportamento `thin`/Easy Connect inalterado).

## Justificativa

Guardar a senha da wallet com o mesmo padrão do perfil (keychain do SO), sem texto plano nas settings.

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - Regras]]
- 📄 PRDs: [[prd-82-tns-wallet|PRD-82]] · [[prd-137-wallet-password-binding|PRD-137]]
- 🎯 Requisitos: [[prd-82-tns-wallet|PRD-82 RF4]] · [[prd-137-wallet-password-binding|PRD-137 RF1]] · [[prd-137-wallet-password-binding|PRD-137 RF2]]
- 🧩 Código: [[COD - connectionProfiles.ts]] · [[COD - oracleRunner.ts]] · [[COD - types.ts]]
- 🧪 Testes: [[TST - connectionProfiles.test.ts]] · [[TST - oracleRunner.test.ts]] · [[TST - prd015ExtraE2E.test.ts]]
- ↩️ Referenciada por: [[Connection]] · [[SEC-012 - Senha da wallet nunca em settings nem em log|SEC-012]] · [[prd-137-wallet-password-binding|PRD-137]] · [[prd-82-tns-wallet|PRD-82]]
<!-- brain:auto:end -->
