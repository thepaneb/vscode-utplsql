---
id: BR-CONN-013
tipo: regra
titulo: Parsing da connection string tolera @ e barra na senha
dominio: conexao
status: ativo
severidade: alta
fonte: codigo
verificado: 2026-09-23
implementacao: ["src/oracleRunner.ts:28", "src/oracleRunner.ts:46", "src/oracleRunner.ts:53"]
testes: ["src/test/unit/oracleRunner.test.ts"]
prds: ["PRD-34"]
tags: ["conexao"]
---
## Enunciado

Se parseConnString recebe a string de conexão, então divide no último @ e no primeiro / das credenciais, entregando o connectString ao oracledb inalterado (Easy Connect, TNS alias, SID, IPv6); se user ou connectString ficar vazio, lança erro de formato inválido.

## Pré-condições

Uso em ensurePool/withOracleConnection antes de createPool.

## Exceções

connectionUser usa o mesmo parser, retorna o usuário em maiúsculas e undefined para formatos inválidos.

## Justificativa

Aceitar senhas com / ou @ e formatos opacos de connectString sem tentar normalizá-los.

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - Regras]]
- 📄 PRDs: [[prd-34-multi-connection-profiles|PRD-34]]
- ↩️ Referenciada por: [[ERR-003 - UTPLSQL_BAD_CONN — credenciais ou connection string inválidas|ERR-003]]
<!-- brain:auto:end -->
