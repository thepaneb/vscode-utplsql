# PRD-72 — Matriz de bancos Oracle para testes de integração

| Campo | Valor |
|---|---|
| Status | Em desenvolvimento |
| Autor | Gil Cleber Barboza |
| Data | 2026-09-18 |
| Componente | Infra local (não vai no VSIX) |
| Versão alvo | 0.13.0 |
| Arquivos afetados | `docker/db-matrix/compose.yaml`, `scripts/db-matrix/*`, `.env.dbmatrix.example`, `.gitignore`, `.vscode-test.mjs` |
| Esforço estimado | 2–3 dias |
| Complexidade | Média |

## 1. Resumo

Criar uma matriz de bancos Oracle em Docker para rodar os testes de integração
contra várias versões, com bootstrap automático (utPLSQL + grants + schemas +
fixtures) e execução uma versão por vez (limite de recursos). A infra é local,
não é empacotada no VSIX, e serve para detectar divergências entre versões.

## 2. Contexto e problema

O ambiente de integração era um único container (`oracle-data`, 23ai Free) e o
bootstrap era um `setup.sh` manual e hardcoded. Isso deixou passar um bug real:
o `splitScript` enviava o `;` final de statements SQL, que o **23ai tolera** mas
**19c/21c rejeitam** (`ORA-00933`/`ORA-00922`). Só apareceu ao rodar contra 21c.
Também não havia como validar cobertura/probe do `DBMS_DEBUG` em versões
diferentes nem conferir a compatibilidade de assinaturas de packages.

## 3. Objetivos / Não-objetivos

**Objetivos**
- Compose paramétrico com as versões-alvo (12.2 slim, 19c EE, 21c XE, 23ai Free).
- Bootstrap idempotente: baixa/instala o utPLSQL, aplica os grants do README
  (+ debugger/cobertura), cria `UT3` e `UTPLSQL_TEST` e compila os fixtures.
- Orquestrador que baixa → sobe → espera → bootstrap → testes → derruba
  (`down -v`), uma versão por vez.
- Credenciais fora do versionamento (`.env.dbmatrix`, gitignored).

**Não-objetivos**
- Rodar a matriz no CI do GitHub (imagens de 7–9 GB não cabem em runner grátis).
- Automatizar a publicação; a matriz é local.
- Suportar 11.2/12.1 (utPLSQL 3.2 usa `DBMS_PLSQL_CODE_COVERAGE`, do 12.2+).

## 4. Requisitos

### RF1 — Compose paramétrico

Um único serviço `db` cujo `image`/`porta`/PDB vêm de variáveis do orquestrador,
sem duplicar definição de serviço:

```yaml
services:
  db:
    image: "${DB_IMAGE:?defina DB_IMAGE}"
    ports: ["${DB_PORT:-1531}:1521"]
    environment:
      ORACLE_PWD: "${ORACLE_PWD:?defina ORACLE_PWD}"
      ORACLE_CHARACTERSET: "AL32UTF8"
```

### RF2 — Bootstrap reutilizável

`scripts/db-matrix/bootstrap.sh <container> <pdb>`:
1. baixa o utPLSQL (`UTPLSQL_VERSION`, default `v.3.2.3`) para um cache local;
2. garante a tablespace `USERS` (o Free-lite não tem);
3. reinstala o utPLSQL via `install_headless.sql` (cria/instala o owner `UT3`);
4. aplica grants: `DBMS_PROFILER`, `DBMS_PLSQL_CODE_COVERAGE`, `DBMS_DEBUG`,
   `DBMS_OUTPUT`, `SELECT ON V$SQL`, `DEBUG CONNECT SESSION`, e `EXECUTE` dos
   objetos de `UT3` para `PUBLIC`;
5. cria `UTPLSQL_TEST` (com `INHERIT PRIVILEGES`) e compila os fixtures
   (`src/test/integration/fixtures/compile_packages.sql`) **no schema da conexão
   (`UT3`)**, que é o que os testes esperam.

### RF3 — Orquestrador

`scripts/db-matrix/run.sh` com opções `--list`, `--only`, `--bootstrap-only`,
`--keep-db`, `--keep-image`, `--no-pull`, `--tests`. Exporta
`UTPLSQL_CONN=UT3/<pass>@//localhost:<porta>/<pdb>` e `WSLENV` (necessário
porque, no WSL, o `node` é o binário do Windows e não herda env do WSL).

### RF4 — Credenciais e versionamento

`.env.dbmatrix` (gitignored) com `ORACLE_AUTH_USER`/`ORACLE_AUTH_TOKEN`
(imagens EE) e overrides; `.env.dbmatrix.example` documenta. Cache do utPLSQL e
`docker/db-matrix/.cache/` no `.gitignore`.

### RF5 — Teste de integração do debugger ligado

Com os grants de debug, `debuggerE2E.test.ts` executa de fato o contrato do
`DBMS_DEBUG` (`INITIALIZE`/`DEBUG_ON`/`DEBUG_OFF`) em vez de `skip`.

**Não-funcionais**
- RNF1 — Uma versão por vez; `down -v` ao final (sem volume persistente entre
  versões).
- RNF2 — Bootstrap idempotente e fail-fast (aborta se o utPLSQL não instalar).

## 5. Solução proposta

```
docker/db-matrix/compose.yaml
scripts/db-matrix/matrix.env       # rótulo|imagem|PDB
scripts/db-matrix/wait-ready.sh    # espera o PDB abrir READ WRITE
scripts/db-matrix/bootstrap.sh
scripts/db-matrix/run.sh
.env.dbmatrix.example
```

`.vscode-test.mjs` passa `UTPLSQL_CONN` explicitamente ao host do VSCode.

### Matriz padrão

| Rótulo | Imagem | Papel |
|---|---|---|
| `12slim` | `database/enterprise:12.2.0.1-slim` | piso útil (12.2+, slim) |
| `19ee` | `database/enterprise:19.19.0.0` | LTS |
| `21xe` | `database/express:21.3.0-xe` | 21c (engine igual à EE) |
| `23free` | `database/free:23.26.3.0` | 23ai (imagem cheia) |

> A variante `-lite` do Free **não serve**: omite o XDB e o utPLSQL falha com
> `ORA-00600 [unable to load XDB library]`.

## 6. Configuração

Nenhuma setting da extensão. Variáveis do orquestrador documentadas em
`.env.dbmatrix.example` e `scripts/db-matrix/matrix.env`.

## 7. Plano de testes

- **Smoke**: `run.sh --only 23free --bootstrap-only` (sobe + bootstrap).
- **Full**: `run.sh --only <versão>` (roda `npm run test:integration`).
- **Unitários**: a infra não tem lógica testável por `node --test`; a validação
  é a execução da matriz.

## 8. Riscos e mitigação

| Risco | Mitigação |
|---|---|
| Imagens grandes estouram o disco | Uma por vez; `down -v`; opção de `docker rmi` ao final |
| OOM com um `oracle-data` rodando | Rodar a matriz sozinha (`docker stop oracle-data`) |
| Credenciais EE expostas | `.env.dbmatrix` gitignored; token nunca no compose |
| Diferenças de PDB (FREEPDB1/XEPDB1/ORCLPDB1) | PDB vem da tabela por versão |

## 9. Rollout

- Infra de desenvolvimento; não entra no VSIX.
- Registrar no `CHANGELOG.md` (Unreleased/versão) junto das correções que a
  matriz revelar.

## 10. Critérios de aceite

- `run.sh --only 23free` e `--only 21xe` terminam com os testes de integração
  verdes (52 passing / 2 pending).
- Bootstrap instala o utPLSQL e compila os fixtures sem intervenção manual.
- `docs:check` e `brain:check` verdes.

## 11. Questões em aberto

- Validar `12slim` e `19ee` (pulls grandes) e registrá-los.
- Rodar a matriz no WSL exigiu `WSLENV`; documentar em `CONTRIBUTING`.
- Avaliar um modo `smoke` (só capacidades Oracle + probe do debugger) para
  feedback rápido.
