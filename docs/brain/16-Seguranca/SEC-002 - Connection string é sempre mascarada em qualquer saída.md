---
id: SEC-002
aliases: [SEC-002]
tipo: seguranca
titulo: Connection string é sempre mascarada em qualquer saída
dominio: segredos
status: ativo
severidade: alta
verificado: 2026-09-23
implementacao: ["src/connectionProfiles.ts:17", "src/connectionProfiles.ts:24"]
testes: ["src/test/unit/connectionProfiles.test.ts"]
regras: ["BR-CONN-008", "BR-CONN-009"]
tags: ["seguranca", "conexao"]
---
## Enunciado

Toda exibição de connection string (picker, logs, output do script runner) passa por maskConnection, que remove a senha mesmo quando ela contém @ ou /.

## Controle

maskConnection corta entre o primeiro / da credencial e o último @; usado no QuickPick de perfis e nas mensagens.

## Justificativa

Evitar vazamento de senha em superfícies de saída e telemetria.

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - Seguranca]]
- 📐 Regras: [[BR-CONN-008 - Mascaramento da senha tolera @ e barra na senha|BR-CONN-008]] · [[BR-CONN-009 - QuickPick de perfil mascara conexão e destaca charset-default|BR-CONN-009]]
- 🧩 Código: [[COD - connectionProfiles.ts]]
- 🧪 Testes: [[TST - connectionProfiles.test.ts]]
<!-- brain:auto:end -->
