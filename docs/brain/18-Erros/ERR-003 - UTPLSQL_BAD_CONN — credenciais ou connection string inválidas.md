---
id: ERR-003
aliases: [ERR-003]
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
tags: [erros, conexao]
---
## Sintoma

Falha ao conectar (usuário/senha, serviço ou formato da connection string); o quick-fix oferece reconfigurar a conexão.

## Causa

Credenciais incorretas, serviço indisponível, formato inválido (parseConnString lança badConnFormat) ou rede.

## Correção

Reconfigurar a conexão (utplsql.configureConnection) ou revisar o perfil ativo; a mensagem nunca expõe a senha.

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - Erros]]
- 📐 Regras: [[BR-CONN-013 - Parsing da connection string tolera @ e barra na senha|BR-CONN-013]]
- 🧩 Código: [[COD - quickfix.ts]] · [[COD - oracleRunner.ts]]
- 🧪 Testes: [[TST - oracleRunner.test.ts]]
- ↩️ Referenciada por: [[BR-CONN-013 - Parsing da connection string tolera @ e barra na senha|BR-CONN-013]]
<!-- brain:auto:end -->
