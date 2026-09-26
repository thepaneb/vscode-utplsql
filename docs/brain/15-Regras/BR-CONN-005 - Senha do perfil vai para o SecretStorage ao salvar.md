---
id: BR-CONN-005
aliases: [BR-CONN-005]
tipo: regra
titulo: Senha do perfil vai para o SecretStorage ao salvar
dominio: conexao
status: ativo
severidade: critica
fonte: codigo
verificado: 2026-09-23
implementacao: ["src/connectionProfiles.ts:111", "src/connectionProfiles.ts:126", "src/connectionProfiles.ts:168"]
testes: ["src/test/unit/connectionProfiles.test.ts"]
prds: ["PRD-34", "PRD-65"]
requisitos: ["PRD-34/RF1", "PRD-65/RF3"]
tags: ["conexao", "seguranca"]
---
## Enunciado

Se saveProfiles recebe um perfil com senha inline, então a senha é extraída (splitPassword), gravada no SecretStorage sob a chave utplsql.profile.<id> e o perfil persistido em utplsql.profiles fica sem a senha.

## Pré-condições

initSecretStorage(context.secrets) já foi chamado; SecretStorage disponível.

## Exceções

Sem senha inline o perfil é salvo como está; se secretStorage não estiver inicializado, persistPassword é no-op, mas o cache em memória ainda é preenchido.

## Justificativa

Impedir senha Oracle em texto plano nas settings sincronizadas (keychain nativa do VSCode).

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - Regras]]
- 📄 PRDs: [[prd-34-multi-connection-profiles|PRD-34]] · [[prd-65-schema-mode-security-fixes|PRD-65]]
- 🎯 Requisitos: [[prd-34-multi-connection-profiles|PRD-34 RF1]] · [[prd-65-schema-mode-security-fixes|PRD-65 RF3]]
- 🧩 Código: [[COD - connectionProfiles.ts]]
- 🧪 Testes: [[TST - connectionProfiles.test.ts]]
- ↩️ Referenciada por: [[09-configuration]] · [[SEC-001 - Senha Oracle nunca é gravada em settings|SEC-001]] · [[SEC-004 - Segredos locais ficam fora do controle de versão|SEC-004]]
<!-- brain:auto:end -->
