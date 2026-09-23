---
id: BR-CONN-007
tipo: regra
titulo: Migração de perfis legados é idempotente
dominio: conexao
status: ativo
severidade: alta
fonte: codigo
verificado: 2026-09-23
implementacao: ["src/connectionProfiles.ts:186", "src/connectionProfiles.ts:202", "src/extension.ts:34"]
testes: ["src/test/unit/connectionProfiles.test.ts"]
tags: ["conexao", "seguranca"]
---
## Enunciado

Se migrateLegacyProfiles roda na ativação, então apenas perfis com senha inline são migrados para o SecretStorage e a settings é reescrita somente quando houve mudança, tornando a operação idempotente.

## Pré-condições

Executada em activate() logo após initSecretStorage(context.secrets).

## Exceções

Perfis já sanitizados são mantidos sem reescrever utplsql.profiles; segunda execução não altera nada.

## Justificativa

Convergir instalações antigas (senha em texto plano) para o SecretStorage sem regravar settings a cada ativação.

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - Regras]]
<!-- brain:auto:end -->
