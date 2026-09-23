---
id: ERR-003
tipo: erro
titulo: UTPLSQL_BAD_CONN — credenciais ou connection string inválidas
dominio: conexao
codigo: UTPLSQL_BAD_CONN
status: ativo
severidade: alta
verificado: 2026-09-23
implementacao: ["src/quickfix.ts:91", "src/oracleRunner.ts:28", "src/oracleRunner.ts:46"]
testes: ["src/test/unit/oracleRunner.test.ts"]
regras: ["BR-CONN-013"]
tags: ["erro", "conexao"]
---
## Sintoma

Falha ao conectar (usuário/senha, serviço ou formato da connection string); o quick-fix oferece reconfigurar a conexão.

## Causa

Credenciais incorretas, serviço indisponível, formato inválido (parseConnString lança badConnFormat) ou rede.

## Correção

Reconfigurar a conexão (utplsql.configureConnection) ou revisar o perfil ativo; a mensagem nunca expõe a senha.

