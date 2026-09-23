---
id: BR-CONN-008
tipo: regra
titulo: Mascaramento da senha tolera @ e barra na senha
dominio: conexao
status: ativo
severidade: alta
fonte: codigo
verificado: 2026-09-23
implementacao: ["src/connectionProfiles.ts:17", "src/connectionProfiles.ts:24"]
testes: ["src/test/unit/connectionProfiles.test.ts"]
prds: ["PRD-34"]
tags: ["conexao", "seguranca"]
---
## Enunciado

Se maskConnection recebe user/senha@resto, então corta tudo entre o primeiro / da credencial e o último @, retornando user@resto mesmo quando a senha contém @ ou /.

## Pré-condições

Uso em exibição (picker, logs/output do script runner).

## Exceções

String sem @ ou sem formato de credencial é retornada inalterada.

## Justificativa

Evitar vazamento de senha em qualquer superfície de saída, inclusive senhas com caracteres especiais.

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - Regras]]
- 📄 PRDs: [[prd-34-multi-connection-profiles|PRD-34]]
<!-- brain:auto:end -->
