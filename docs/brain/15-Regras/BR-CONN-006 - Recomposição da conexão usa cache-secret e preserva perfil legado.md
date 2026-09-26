---
id: BR-CONN-006
aliases: [BR-CONN-006]
tipo: regra
titulo: Recomposição da conexão usa cache/secret e preserva perfil legado
dominio: conexao
status: ativo
severidade: alta
fonte: codigo
verificado: 2026-09-23
implementacao: ["src/connectionProfiles.ts:173", "src/connectionProfiles.ts:180"]
testes: ["src/test/unit/connectionProfiles.test.ts"]
prds: ["PRD-34"]
requisitos: ["PRD-34/RF5"]
tags: ["conexao"]
---
## Enunciado

Se getProfileConnection é chamada, então ela reconstrói user/senha@host usando a senha do cache em memória; se a credencial já contém /, retorna a connection como está (perfil legado com senha inline).

## Pré-condições

Perfil sem senha na settings e senha presente no cache (hidratada ou recém-salva).

## Exceções

Connection sem @ retorna inalterada; senha ausente no cache retorna a conexão sem senha.

## Justificativa

Manter perfis utilizáveis após o save (senha fora das settings) e preservar compatibilidade com perfis legados.

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - Regras]]
- 📄 PRDs: [[prd-34-multi-connection-profiles|PRD-34]]
- 🎯 Requisitos: [[prd-34-multi-connection-profiles|PRD-34 RF5]]
- 🧩 Código: [[COD - connectionProfiles.ts]]
- 🧪 Testes: [[TST - connectionProfiles.test.ts]]
- ↩️ Referenciada por: [[09-configuration]]
<!-- brain:auto:end -->
