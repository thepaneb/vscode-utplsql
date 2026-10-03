---
id: BR-CONN-006
aliases: [BR-CONN-006]
tipo: regra
titulo: Recomposição da conexão usa cache/secret e preserva perfil legado
dominio: conexao
status: ativo
severidade: alta
fonte: codigo
verificado: 2026-09-28
implementacao: ["src/connectionProfiles.ts:218", "src/connectionProfiles.ts:234"]
testes: ["src/test/unit/connectionProfiles.test.ts"]
prds: ["PRD-34"]
requisitos: ["PRD-34/RF5", "PRD-81/RNF2"]
tags: ["conexao"]
---
## Enunciado

Se getProfileConnection é chamada, então ela reconstrói user/senha@host usando a senha do cache **apenas se o vínculo bater** (a conexão salva com a senha é a conexão atual do perfil — PRD-81 RF3); se a credencial já contém /, retorna a connection como está (perfil legado com senha inline).

## Pré-condições

Perfil sem senha na settings e senha presente no cache (hidratada ou recém-salva) com a mesma connection.

## Exceções

Connection sem @ retorna inalterada; senha ausente no cache ou vinculada a outra conexão retorna a conexão sem senha.

## Justificativa

Manter perfis utilizáveis após o save (senha fora das settings) e preservar compatibilidade com perfis legados.

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - Regras]]
- 📄 PRDs: [[prd-34-multi-connection-profiles|PRD-34]]
- 🎯 Requisitos: [[prd-34-multi-connection-profiles|PRD-34 RF5]] · [[prd-81-security-hardening|PRD-81 RNF2]]
- 🧩 Código: [[COD - connectionProfiles.ts]]
- 🧪 Testes: [[TST - connectionProfiles.test.ts]]
- ↩️ Referenciada por: [[09-configuration]] · [[ADR-010 - Perfis de conexao com senha no SecretStorage|ADR-010]] · [[Connection-profiles]] · [[prd-34-multi-connection-profiles|PRD-34]]
<!-- brain:auto:end -->
