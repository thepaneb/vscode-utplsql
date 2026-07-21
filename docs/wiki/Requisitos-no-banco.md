# Requisitos no banco

Grants e configurações necessárias no banco Oracle para usar a extensão
com todos os recursos.

## Cobertura (sempre)

Habilita o profiler para o schema que roda os testes:

```sql
GRANT EXECUTE ON SYS.DBMS_PROFILER TO <schema_que_roda_os_testes>;
GRANT EXECUTE ON SYS.DBMS_PLSQL_CODE_COVERAGE TO <schema_que_roda_os_testes>;
```

Sem esses grants, os testes rodam mas a cobertura sai **vazia** (0%).

> No Oracle 19c, o pacote `DBMS_PLSQL_CODE_COVERAGE` pode não existir.
> Nesse caso, apenas `DBMS_PROFILER` basta — mas a cobertura será menos
> precisa.

## Descoberta de testes em OUTROS schemas

Quando o utPLSQL está instalado de forma **compartilhada** (owner `UT3`
com testes em schemas de aplicação separados), o owner do utPLSQL precisa
**ler o dicionário** dos schemas de aplicação:

```sql
GRANT SELECT ON SYS.DBA_SOURCE     TO <ut3_owner>;
GRANT SELECT ON SYS.DBA_OBJECTS    TO <ut3_owner>;
GRANT SELECT ON SYS.DBA_PROCEDURES TO <ut3_owner>;
```

**Importante:**
- **`SELECT ANY DICTIONARY` sozinho NÃO basta** — precisa dos grants
  **diretos** nessas views (por causa do `dbms_assert.sql_object_name`
  em contexto definer).
- É preciso também o **gatilho de DDL** do utPLSQL instalado (mantém o
  cache de annotations em dia após alterações de código).

Verificação (como o owner):
```sql
SELECT ut_metadata.get_source_view_name FROM dual;
-- deve retornar: dba_source
```

## Arquitetura de schemas

![Arquitetura de schemas — owner UT3 + app schemas](images/diagram-schemas.png)

### Install compartilhado (recomendado)

```
┌─────────────────────┐
│  UT3 (utPLSQL owner) │  ← grants SELECT ON DBA_SOURCE/OBJECTS/PROCEDURES
└────────┬────────────┘
         │ lê annotations
    ┌────┴────┐
    │ DEV     │  ← schemas de aplicação com os testes
    │ TEST    │
    └─────────┘
```

### Install por schema

```
┌─────────────────────┐
│  DEV (utPLSQL + testes) │  ← mesmo schema, sem grants cross-schema
└─────────────────────┘
```

> Em install **por schema**, os grants `DBA_SOURCE`/`DBA_OBJECTS`/
> `DBA_PROCEDURES` **não** são necessários — o framework lê o próprio
> source.

## Verificação completa

Rode este script como DBA para auditar a configuração:

```sql
-- 1. Verifica se o utPLSQL está instalado
SELECT ut_meta.version() FROM dual;

-- 2. Verifica grants de profiler (cobertura)
SELECT grantee, table_name, privilege
FROM dba_tab_privs
WHERE table_name IN ('DBMS_PROFILER', 'DBMS_PLSQL_CODE_COVERAGE')
  AND grantee IN ('UT3', 'DEV', 'TEST');

-- 3. Verifica grants de dicionário (descoberta cross-schema)
SELECT grantee, table_name, privilege
FROM dba_tab_privs
WHERE table_name IN ('DBA_SOURCE', 'DBA_OBJECTS', 'DBA_PROCEDURES')
  AND grantee = 'UT3';

-- 4. Verifica view de source do utPLSQL
SELECT ut_metadata.get_source_view_name FROM dual;
-- Esperado: dba_source (compartilhado) ou all_source (por schema)
```
