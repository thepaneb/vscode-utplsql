---
id: BR-CONN-017
aliases: [BR-CONN-017]
tipo: regra
titulo: Senha da wallet vai para o SecretStorage e é propagada ao pool
dominio: conexao
status: ativo
severidade: alta
fonte: codigo
verificado: 2026-09-28
implementacao: ["src/connectionProfiles.ts:281", "src/connectionProfiles.ts:276", "src/oracleRunner.ts:115", "src/types.ts:31"]
testes: ["src/test/unit/connectionProfiles.test.ts", "src/test/unit/oracleRunner.test.ts"]
prds: ["PRD-82"]
requisitos: ["PRD-82/RF4"]
tags: ["conexao", "seguranca"]
---
## Enunciado

A senha da wallet Oracle Cloud é gravada no SecretStorage sob `utplsql.wallet.<profileId>` (comando `utPLSQL: Set wallet password`; entrada vazia limpa). O pool passa `walletLocation` e `walletPassword` ao `createPool` somente quando definidos; `walletLocation` fica no perfil.

## Pré-condições

Perfil ativo com `walletLocation`; SecretStorage inicializado.

## Exceções

Sem `walletLocation`/senha, o `createPool` não recebe os campos (comportamento `thin`/Easy Connect inalterado).

## Justificativa

Guardar a senha da wallet com o mesmo padrão do perfil (keychain do SO), sem texto plano nas settings.

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - Regras]]
- 📄 PRDs: [[prd-82-tns-wallet|PRD-82]]
- 🎯 Requisitos: [[prd-82-tns-wallet|PRD-82 RF4]]
- 🧩 Código: [[COD - connectionProfiles.ts]] · [[COD - oracleRunner.ts]] · [[COD - types.ts]]
- 🧪 Testes: [[TST - connectionProfiles.test.ts]] · [[TST - oracleRunner.test.ts]]
- ↩️ Referenciada por: [[SEC-012 - Senha da wallet nunca em settings nem em log|SEC-012]]
<!-- brain:auto:end -->
