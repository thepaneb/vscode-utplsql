---
id: SEC-002
aliases: [SEC-002]
tipo: seguranca
titulo: Connection string é sempre mascarada em qualquer saída
dominio: segredos
status: ativo
severidade: alta
verificado: 2026-09-28
implementacao: ["src/connectionProfiles.ts:22", "src/connectionProfiles.ts:24", "src/oracleRunner.ts:46"]
testes: ["src/test/unit/connectionProfiles.test.ts", "src/test/unit/oracleRunner.test.ts"]
regras: ["BR-CONN-008", "BR-CONN-009"]
tags: ["seguranca", "conexao"]
---
## Enunciado

Toda exibição de connection string (picker, logs, output do script runner, mensagens de erro) passa por maskConnection, que remove a senha mesmo quando ela contém @ ou / — inclusive na credencial sem @ (conexão malformada).

## Controle

maskConnection corta entre o primeiro / da credencial e o último @; sem @, corta após o 1º /. É usado no QuickPick de perfis e nas mensagens. `parseConnString` mascara a connection **antes** de embuti-la em `oracleRunner.badConnFormat` (nunca ecoa a string crua com a senha).

## Justificativa

Evitar vazamento de senha em superfícies de saída e telemetria.

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - Seguranca]]
- 📐 Regras: [[BR-CONN-008 - Mascaramento da senha tolera @ e barra na senha|BR-CONN-008]] · [[BR-CONN-009 - QuickPick de perfil mascara conexão e destaca charset-default|BR-CONN-009]]
- 🧩 Código: [[COD - connectionProfiles.ts]] · [[COD - oracleRunner.ts]]
- 🧪 Testes: [[TST - connectionProfiles.test.ts]] · [[TST - oracleRunner.test.ts]]
<!-- brain:auto:end -->
