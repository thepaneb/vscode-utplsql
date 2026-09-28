---
id: BR-CONN-008
aliases: [BR-CONN-008]
tipo: regra
titulo: Mascaramento da senha tolera @ e barra na senha
dominio: conexao
status: ativo
severidade: alta
fonte: codigo
verificado: 2026-09-28
implementacao: ["src/connectionProfiles.ts:22", "src/connectionProfiles.ts:24", "src/connectionProfiles.ts:31"]
testes: ["src/test/unit/connectionProfiles.test.ts"]
prds: ["PRD-34"]
requisitos: ["PRD-34/RF4"]
tags: ["conexao", "seguranca"]
---
## Enunciado

Se maskConnection recebe uma credencial com senha, então remove a senha: com `@`, corta tudo entre o primeiro `/` da credencial e o último `@`, retornando `user@resto` mesmo quando a senha contém `@` ou `/`; sem `@` (conexão malformada, ex.: `scott/tiger`), corta após o 1º `/`, retornando `user`.

## Pré-condições

Uso em exibição (picker, logs/output do script runner, mensagens de erro).

## Exceções

String sem `@` e sem `/` é retornada inalterada (ex.: `sem-formato`).

## Justificativa

Evitar vazamento de senha em qualquer superfície de saída, inclusive senhas com caracteres especiais.

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - Regras]]
- 📄 PRDs: [[prd-34-multi-connection-profiles|PRD-34]]
- 🎯 Requisitos: [[prd-34-multi-connection-profiles|PRD-34 RF4]]
- 🧩 Código: [[COD - connectionProfiles.ts]]
- 🧪 Testes: [[TST - connectionProfiles.test.ts]]
- ↩️ Referenciada por: [[09-configuration]] · [[SEC-002 - Connection string é sempre mascarada em qualquer saída|SEC-002]]
<!-- brain:auto:end -->
