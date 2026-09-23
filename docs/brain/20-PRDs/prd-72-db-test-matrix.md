---
tipo: prd
id: PRD-72
aliases: [PRD-72]
status: completed
titulo: "Matriz de bancos Oracle para testes de integração"
versao: "0.12.1"
data: "2026-09-18"
autor: "Gil Cleber Barboza"
verificado: 2026-09-23
tags: [prd]
---

# PRD-72 — Matriz de bancos Oracle para testes de integração

| Campo | Valor |
|---|---|
| Autor | Gil Cleber Barboza |
| Data | 2026-09-18 |
| Componente | Infra local (não vai no VSIX) |
| Versão alvo | 0.12.1 |
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

`scripts/db-matrix/run.sh` com opções `--list`, `--only`, `--smoke`, `--thick`,
`--bootstrap-only`, `--skip-bootstrap`, `--clean`, `--keep-db`, `--keep-image`,
`--no-pull`, `--tests`. Exporta
`UTPLSQL_CONN=UT3/<pass>@//localhost:<porta>/<pdb>` e `WSLENV` (necessário
porque, no WSL, o `node` é o binário do Windows e não herda env do WSL).
Atalhos npm: `npm run db:matrix` e `npm run db:matrix:list`.

O modo **smoke** (`npm run test:integration:smoke`, config
`.vscode-test.smoke.mjs`) roda só as capacidades Oracle + o contrato do
`DBMS_DEBUG` (~7s por versão, após o bootstrap).

### RF4 — Credenciais e versionamento

`.env.dbmatrix` (gitignored) com `ORACLE_AUTH_USER`/`ORACLE_AUTH_TOKEN`
(imagens EE) e overrides; `.env.dbmatrix.example` documenta. Cache do utPLSQL e
`docker/db-matrix/.cache/` no `.gitignore`.

### RF5 — Teste de integração do debugger ligado

Com os grants de debug, `debuggerE2E.test.ts` executa de fato o contrato do
`DBMS_DEBUG` (`INITIALIZE`/`DEBUG_ON`/`DEBUG_OFF`) em vez de `skip`.

### RF6 — Persistência por versão

Os datafiles ficam num volume nomeado por versão (`utplsql-dbmatrix-<label>`),
montado em `/opt/oracle/oradata` (caminho comum às imagens da matriz). A 1ª
subida cria o banco; as seguintes sobem em ~1–2 min. `run.sh --clean` apaga o
volume para recomeçar do zero; `--skip-bootstrap` pula o reinstall do
utPLSQL/fixtures quando o volume já está preparado.

**Não-funcionais**
- RNF1 — Uma versão por vez; o container é derrubado no fim, mas o volume da
  versão é preservado (rápido re-run). `--clean` remove o volume.
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

| Rótulo | Imagem | Serviço | Papel |
|---|---|---|---|
| `18xe` | `database/express:18.4.0-xe` | `XEPDB1` | 18c XE (piso efetivo) |
| `19ee` | `database/enterprise:19.3.0.0` | `orclpdb1` | LTS |
| `21xe` | `database/express:21.3.0-xe` | `XEPDB1` | 21c (engine igual à EE) |
| `23free` | `database/free:23.26.3.0` | `FREEPDB1` | 23ai (imagem cheia) |

### Descobertas da validação

- **18c XE**: o `sqlplus / as sysdba` (bequeath/OS auth) falha com `ORA-12547`;
  só o **SYSDBA por rede** funciona. Além disso, a imagem **cria o banco do
  zero (~15 min)**, estourando o timeout original de 900s. Corrigido com
  `WAIT_TIMEOUT` (default 1800s) e conexões por rede no wait/bootstrap.
- **19c**: a tag `19.19.0.0` é **arm64-only** no registry (`exec format error`
  em amd64). Usar `19.3.0.0` (amd64) e forçar `platform: linux/amd64` no
  compose. O serviço do PDB é `orclpdb1` (sem domínio).
- **12.2 (slim)**: **incompatível com o utPLSQL 3.2.3**.
  `DBMS_PREPROCESSOR.SOURCE_LINES_T` é array associativo (sem construtor) e o
  pacote chama `source_lines_t()` → `PLS-00222`. Removido da matriz padrão.
- **12.2 EE** registra o serviço com domínio (`orclpdb1.localdomain`) e **ignora
  `ORACLE_PWD`** (senha default); por isso o wait-ready normaliza a senha via OS
  auth quando disponível.
- **`-lite` do Free**: omite o XDB e o utPLSQL falha no install
  (`ORA-00600 [unable to load XDB library]`). Usar a imagem cheia.
- **Volume e datafiles**: o 18c XE tem `db_create_file_dest` vazio, então um
  `CREATE TABLESPACE users DATAFILE 'users01.dbf'` (relativo) caía em
  `$ORACLE_HOME/dbs` — fora do volume — e o PDB ficava preso em `MOUNTED` após
  recriar o container. O bootstrap usa caminho absoluto dentro de
  `/opt/oracle/oradata`.
- **Thick mode (Instant Client)**: não pode rodar junto com a suíte normal — a
  inicialização é global e irreversível no processo, e `prd70-sqlplus` exige o
  thin default (além de a auto-ativação da extensão criar conexão thin antes,
  gerando `NJS-118`). Solução: `npm run test:integration:thick`
  (`.vscode-test.thick.mjs`) num workspace vazio, sem ativar a extensão; o gate
  é `UTPLSQL_THICK_TEST=1` (evita rodar thick na suíte normal via `.env`).

> Resultado: **18xe, 19ee, 21xe e 23free** passam com 52 passing / 2 pending na
> suíte normal; o eixo **thick** (`--thick`) passa com 2 passing em cada uma.

## 6. Configuração

Nenhuma setting da extensão. Variáveis do orquestrador documentadas em
`.env.dbmatrix.example` e `scripts/db-matrix/matrix.env`.

## 7. Plano de testes

- **Smoke**: `npm run db:matrix -- --smoke` (capacidades + `DBMS_DEBUG`, ~7s por
  versão após o bootstrap).
- **Full**: `npm run db:matrix` (suíte de integração completa por versão).
- **Thick**: `npm run db:matrix -- --thick` (host isolado; exige
  `ORACLE_CLIENT_LIB_DIR`).
- **Bootstrap only**: `npm run db:matrix -- --bootstrap-only --only 23free`.
- **Unitários**: a infra não tem lógica testável por `node --test`; a validação
  é a execução da matriz.

## 8. Riscos e mitigação

| Risco | Mitigação |
|---|---|
| Imagens grandes estouram o disco | Uma por vez; `docker image rm` ao final (default) |
| Volumes por versão acumulam disco | `run.sh --clean` remove o volume; `docker volume ls/rm` para gerenciar |
| OOM com um `oracle-data` rodando | Rodar a matriz sozinha (`docker stop oracle-data`) |
| Credenciais EE expostas | `.env.dbmatrix` gitignored; token nunca no compose |
| Volume de versão incompatível (imagem trocada) | `run.sh --clean` recria o volume |

## 9. Rollout

- Infra de desenvolvimento; não entra no VSIX.
- Registrar no `CHANGELOG.md` (Unreleased/versão) junto das correções que a
  matriz revelar.

## 10. Critérios de aceite

- `run.sh --only <versão>` para `18xe`, `19ee`, `21xe` e `23free` termina com os
  testes de integração verdes (52 passing / 2 pending).
- `npm run test:integration:thick` passa em cada versão (2 passing) com
  `ORACLE_CLIENT_LIB_DIR` apontando para um Instant Client.
- A 2ª run de uma versão reaproveita o volume (sem recriar o banco): boot em
  ~1–2 min; `--skip-bootstrap --smoke` conclui em ~1 min.
- Bootstrap instala o utPLSQL e compila os fixtures sem intervenção manual.
- `docs:check` e `brain:check` verdes.

## 11. Questões em aberto

- Reavaliar 12.2 caso o utPLSQL seja atualizado (o problema é o
  `DBMS_PREPROCESSOR.SOURCE_LINES_T` sem construtor no 12.2 base).
- Reavaliar `19.19.0.0` se a Oracle publicar a variante amd64.

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - PRDs]]
<!-- brain:auto:end -->
