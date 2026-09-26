---
id: BR-CONN-001
aliases: [BR-CONN-001]
tipo: regra
titulo: Precedência de resolução da conexão
dominio: conexao
status: ativo
severidade: critica
fonte: codigo
verificado: 2026-09-23
implementacao: ["src/config.ts:171", "src/config.ts:195"]
testes: ["src/test/unit/config.test.ts"]
prds: ["PRD-34", "PRD-66"]
requisitos: ["PRD-34/RF5"]
tags: ["conexao"]
---
## Enunciado

Se a conexão é resolvida sem prompt, então a ordem de precedência é: perfil ativo > setting utplsql.connection > variável de ambiente UTPLSQL_CONN > cache da sessão; o primeiro valor não-vazio é retornado e marca o context key utplsql:connected=true.

## Pré-condições

Função chamada antes de qualquer prompt; perfil ativo precisa existir em utplsql.profiles com o id de utplsql.activeProfile.

## Exceções

Strings em branco (após trim) são ignoradas em cada nível. Se nada estiver configurado retorna undefined sem interagir com o usuário.

## Justificativa

Permitir escolher explicitamente o ambiente via perfil sem exigir prompt e manter a conexão de sessão como último recurso; nunca expor prompt em fluxos não interativos.

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - Regras]]
- 📄 PRDs: [[prd-34-multi-connection-profiles|PRD-34]] · [[prd-66-connection-robustness-logging|PRD-66]]
- 🎯 Requisitos: [[prd-34-multi-connection-profiles|PRD-34 RF5]]
- 🧩 Código: [[COD - config.ts]]
- 🧪 Testes: [[TST - config.test.ts]]
- ↩️ Referenciada por: [[09-configuration]] · [[Connection]] · [[SEC-010 - Fluxos não interativos nunca abrem prompt de conexão|SEC-010]]
<!-- brain:auto:end -->
