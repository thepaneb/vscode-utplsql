---
id: BR-CONN-001
tipo: regra
titulo: Precedência de resolução da conexão
dominio: conexao
status: ativo
severidade: critica
fonte: codigo
verificado: 2026-09-23
implementacao: ["src/config.ts:171", "src/config.ts:195"]
testes: ["src/test/unit/config.test.ts"]
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

