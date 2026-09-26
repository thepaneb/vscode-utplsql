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
SELECT table_owner
FROM ALL_SYNONYMS
WHERE synonym_name = 'UT_RUNNER'
  AND owner = 'PUBLIC';
```

- Retorna algo como `UT3` → prefixo `UT3.`
- Sem synonym público (ou `ALL_SYNONYMS` inacessível) → prefixo vazio `''`.

## Notas

- A função nunca lança: em erro de acesso retorna `''` (best-effort).
- Fallback em `findInvalidUt3Objects`: `prefix.replace(/\.$/, '') || 'UT3'`.
- Shared install sem grants → `ORA-00942` → mensagem amigável na extensão.

## Relacionado

- [[MOC - Oracle]]
- [[ADR-001 - Execucao via Oracle direto]]
