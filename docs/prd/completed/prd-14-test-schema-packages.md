# PRD-14 — Schema e objetos de teste utPLSQL

| Campo | Valor |
|---|---|
| Status | Concluído |
| Autor | Gil Cleber Barboza |
| Data | 2026-07-11 |
| Componente | Extensão `paneb.vscode-utplsql` |
| Versão alvo | 0.6.0 |
| Arquivos afetados | `src/test/integration/fixtures/test_betwnvarchar.pks` (novo), `src/test/integration/fixtures/test_math.pks` (novo), `src/test/integration/fixtures/test_employees.pks` (novo), `src/test/integration/setup.sql` (novo) |

## 1. Resumo

Criar o schema `UTPLSQL_TEST` no banco Oracle com 3 packages de exemplo que usam annotations `%suite`/`%test`, e seus arquivos `.pks` correspondentes no workspace para a descoberta de suites da extensão. Isso permite testar o fluxo completo: descoberta → execução → parse de resultados → cobertura.

## 2. Contexto e problema

A extensão depende de dois mecanismos:
1. **Descoberta**: ler arquivos `.pks` no workspace e extrair `%suite`/`%test` via `suiteParser.ts`.
2. **Execução**: chamar `utplsql run` com `-p=<package>` e parsear os relatórios JUnit e Cobertura.

Sem objetos reais no banco e seus `.pks` correspondentes no workspace, não é possível testar:
- Se o parser lê corretamente annotations com caracteres especiais.
- Se o mapeamento `lastSegment(classname) → packageName` funciona com o formato real do utPLSQL-cli.
- Se a cobertura é gerada e mapeada corretamente.

## 3. Objetivos / Não-objetivos

**Objetivos**
- Criar script SQL de setup (`setup.sql`) que cria schema, concede privilégios e compila packages.
- Criar 3 packages de exemplo com cenários variados: sucesso, falha esperada, before/after.
- Criar arquivos `.pks` no workspace na pasta `src/test/integration/fixtures/`.
- Garantir que os packages sejam descobertos pela extensão via `utplsql.includePatterns`.

**Não-objetivos**
- Instalar Java ou utPLSQL-cli (escopo do PRD-13).
- Modificar os testes de integração existentes (escopo do PRD-15).
- Criar packages complexos ou com dependências externas.

## 4. Requisitos

### RF1 — Script `setup.sql`

Script SQL idempotente que:
```sql
-- Drop schema se existir (CASCADE)
DROP USER utplsql_test CASCADE;

-- Cria schema
CREATE USER utplsql_test IDENTIFIED BY "utplsql_test#2026"
  DEFAULT TABLESPACE users QUOTA UNLIMITED ON users;
GRANT CONNECT, RESOURCE, CREATE PROCEDURE, CREATE TYPE TO utplsql_test;

-- Concede acesso ao framework utPLSQL
BEGIN
  ut3.ut.grant_access_to('UTPLSQL_TEST');
END;
/

-- Concede profiler para cobertura
GRANT EXECUTE ON SYS.DBMS_PROFILER TO UTPLSQL_TEST;
```

### RF2 — Package `test_betwnvarchar`

Testa o cenário mais básico: uma asserção simples.

```sql
CREATE OR REPLACE PACKAGE test_betwnvarchar AS
  --%suite(Between VARCHAR)
  --%suitepath(utplsql_test)

  --%test(Returns string between two string boundaries)
  PROCEDURE string_between_two_strings;
END;
```

```sql
CREATE OR REPLACE PACKAGE BODY test_betwnvarchar AS
  PROCEDURE string_between_two_strings IS
  BEGIN
    ut.expect('between').to_equal('between');
  END;
END;
```

### RF3 — Package `test_math`

Testa sucesso e exceção esperada.

```sql
CREATE OR REPLACE PACKAGE test_math AS
  --%suite(Math operations)
  --%suitepath(utplsql_test)

  --%test(Adds two numbers)
  PROCEDURE adds_two_numbers;

  --%test(Divides by zero raises exception)
  PROCEDURE divide_by_zero;
END;
```

Body: `adds_two_numbers` assere `2 + 2 = 4`; `divide_by_zero` captura `ZERO_DIVIDE` e passa.

### RF4 — Package `test_employees`

Testa ciclo de vida com `%beforetest`/`%aftertest` e tabela real.

```sql
CREATE OR REPLACE PACKAGE test_employees AS
  --%suite(Employees tests)
  --%suitepath(utplsql_test)

  --%test(Returns all employees)
  PROCEDURE returns_all_employees;

  --%test(Throws on invalid id)
  PROCEDURE throws_on_invalid_id;

  --%beforetest
  PROCEDURE setup;

  --%aftertest
  PROCEDURE cleanup;
END;
```

Body cria tabela temporária no `setup`, insere dado, testa, e limpa no `cleanup`.

### RF5 — Arquivos `.pks`

Cada arquivo `.pks` deve conter **apenas a spec** (CREATE OR REPLACE PACKAGE), pois o `suiteParser.ts` lê annotations da spec.

Arquivos:
- `src/test/integration/fixtures/test_betwnvarchar.pks`
- `src/test/integration/fixtures/test_math.pks`
- `src/test/integration/fixtures/test_employees.pks`

## 5. Solução proposta

### 5.1 Estrutura de diretórios

```
src/test/integration/
  fixtures/
    setup.sql                    # Script SQL completo
    test_betwnvarchar.pks        # Spec para descoberta
    test_math.pks                # Spec para descoberta
    test_employees.pks           # Spec para descoberta
```

### 5.2 Script de setup

Criar `setup.sql` que é idempotente (pode rodar múltiplas vezes). O script:
1. Dropa o schema `UTPLSQL_TEST` se existir.
2. Cria o schema e concede privilégios.
3. Concede acesso ao utPLSQL e DBMS_PROFILER.
4. Compila os 3 packages (spec + body).

### 5.3 Execução do setup

```bash
docker exec -i oracle-data sqlplus -s \
  sys/Oracle#2026@//localhost:1521/freepdb1 as sysdba \
  @src/test/integration/fixtures/setup.sql
```

## 6. Configuração

Nenhuma setting nova. Os arquivos `.pks` serão descobertos pelo pattern `**/*.pks` (default).

## 7. Plano de testes

- **Unitários**: N/A.
- **Integração**: rodar o setup.sql, depois executar os testes via extensão manualmente.
- **Validação manual**:
  1. `utplsql.refresh` — deve mostrar 3 suites com 5 testes no total.
  2. `utplsql.runAll` — 5 testes, 4 passando, 1 skipped/failed (depende do design).
  3. Verificar output do JUnit no terminal.

## 8. Riscos e mitigação

| Risco | Mitigação |
|---|---|
| Nome do schema hardcoded conflita com outro projeto | Prefixo `UTPLSQL_TEST` é suficientemente específico |
| Packages compilam com warning | Adicionar `ALTER SESSION SET PLSQL_WARNINGS='ENABLE:ALL'` no setup |
| Dependência de tabela `HR.EMPLOYEES` pode não existir | `test_employees` cria tabela própria no setup |

## 9. Rollout

- Execução imediata após PRD-13.
- Os arquivos `.pks` entram no repositório como fixtures de teste.

## 10. Critérios de aceite

- `setup.sql` roda sem erros.
- `SELECT * FROM all_objects WHERE owner = 'UTPLSQL_TEST'` retorna 3 packages.
- Arquivos `.pks` existem em `src/test/integration/fixtures/`.
- `utplsql.refresh` descobre 3 suites.

## 11. Questões em aberto

- Incluir um teste que falha de propósito para validar o reporting de falhas?
