---
tipo: snippet
status: ativo
linguagem: sql
data: 2026-09-15
tags: [snippet, oracle, schema]
---

# Descobrir o prefixo do schema utPLSQL

## Quando usar

A instalação do utPLSQL pode ser *shared* (ex.: owner `UT3`) ou local. Para montar queries
de buffer, precisamos do prefixo `UT3.`. Em `oracleRunner.ts` isso é feito por
`discoverUtplsqlSchema(conn)`.

## Código

```sql
-- 1) Ordem de resolução de nome do Oracle
SELECT prio, kind, owner, table_owner
FROM (
  SELECT 0 AS prio, 'OBJECT' AS kind, owner, NULL AS table_owner
    FROM all_objects
   WHERE object_name = 'UT_RUNNER' AND object_type = 'PACKAGE'
     AND owner = SYS_CONTEXT('USERENV','CURRENT_SCHEMA')
  UNION ALL
  SELECT 1, 'SYNONYM', owner, table_owner
    FROM all_synonyms
   WHERE synonym_name = 'UT_RUNNER'
     AND owner = SYS_CONTEXT('USERENV','CURRENT_SCHEMA')
  UNION ALL
  SELECT 2, 'SYNONYM', owner, table_owner
    FROM all_synonyms
   WHERE synonym_name = 'UT_RUNNER' AND owner = 'PUBLIC'
) ORDER BY prio;

-- 2) Fallback: qualquer UT_RUNNER acessível (prefere UT3)
SELECT owner FROM all_objects
 WHERE object_name = 'UT_RUNNER' AND object_type = 'PACKAGE'
 ORDER BY CASE WHEN owner = 'UT3' THEN 0 ELSE 1 END, owner;
```

- `OBJECT` no schema atual → prefixo vazio `''` (resolve pelo schema atual).
- `SYNONYM` cujo `TABLE_OWNER` difere do owner → prefixo `TABLE_OWNER.` (ex.: `UT3.`).
- `SYNONYM` para o próprio schema → prefixo vazio.
- Fallback sem synonym → prefixo `OWNER.` do pacote acessível (prefere `UT3`).
- Sem resultado ou erro de acesso → prefixo vazio `''`.

## Notas

- A função nunca lança: em erro de acesso retorna `''` (best-effort).
- O prefixo é validado por `sanitizeSchemaPrefix` antes de entrar no SQL.
- O prefixo qualifica `ut_runner.run`, `UT_VARCHAR2_LIST`, `UT_REPORTERS`,
  reporters e as queries de buffer; no debug, também `ut_varchar2_list`/`ut_reporters`.
- Shared install sem grants nas tabelas de buffer → `ORA-00942` → mensagem
  amigável na extensão.
- Cobertura em shared install também exige synonyms para `DBMSPCC_BLOCKS`,
  `DBMSPCC_RUNS` e `DBMSPCC_UNITS` (os packages `UT_COVERAGE_*` usam
  `AUTHID CURRENT_USER`).

## Relacionado

- [[MOC - Oracle]]
- [[ADR-001 - Execucao via Oracle direto]]
