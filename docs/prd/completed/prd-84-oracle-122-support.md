# PRD-84 — Suporte a Oracle 12.2 com piso alternativo de utPLSQL e charset de conexão

| Campo | Valor |
|---|---|
| Status | Concluído |
| Autor | Gil Cleber Barboza |
| Data | 2026-09-22 |
| Componente | Extensão `paneb.vscode-utplsql` |
| Versão alvo | 0.13.0 |
| Arquivos afetados | `scripts/db-matrix/*`, `.env.dbmatrix.example`, `src/oracleRunner.ts` (+ módulos que abrem conexão), `src/config.ts`, `package.json`, `README.md`, `docs/wiki/Database-requirements.md`, `docs/prd/index.md` |
| Esforço estimado | 1–2 dias |
| Complexidade | Média |
| Relaciona-se a | PRD-70 (thick mode), PRD-72 (matriz de bancos) |

## 1. Resumo

Suportar oficialmente o Oracle **12.2** na matriz de bancos, que hoje fica de
fora porque o utPLSQL **3.2.x não compila** nele. A solução é **piso alternativo
de utPLSQL por versão de banco**: 3.2.x para 18c+ e **3.1.14** para 12.2. Além
disso, corrigir o **`€` (euro) corrompido** no 12.2, causado pelo `NLS_LANG`
default que faz a sessão thin usar `WE8DEC` em vez do `AL32UTF8` do banco.

## 2. Contexto e problema

Levantamento empírico (2026-09-22) subindo a imagem
`database/enterprise:12.2.0.1-slim`:

**2.1 — utPLSQL 3.2.x não compila no 12.2.**
`ut_runner.rebuild_annotation_cache`/`ut.run` falham com
`ORA-04063: package body "UT3.UT_ANNOTATION_MANAGER" has errors`; o `ALL_ERRORS`
aponta `PLS-00222: no function with name 'SOURCE_LINES_T' exists in this scope`
(linha 238). Causa: no **18c** o `DBMS_PREPROCESSOR.SOURCE_LINES_T` virou nested
table (tem construtor); no **12.2** é array associativo
(`table of varchar2(32767) index by binary_integer`, sem construtor). O utPLSQL
passou a chamar `dbms_preprocessor.source_lines_t()` a partir do **3.2.0**
(confirmado comparando as tags: 3.1.x usa o tipo só como variável; 3.2.x chama o
construtor). O próprio utPLSQL declara, na 3.2.01, "Dropped support for Oracle
Database versions older than 19c".

**2.2 — Charset do 12.2 corrompe não-ASCII (limitação do thin, não da extensão).**
Com o utPLSQL 3.1.14 instalado, o 12.2 passa em quase tudo (integração
60 passing / 1 failing), mas:

```
expected: 'çãõ €'   actual: 'çãõ ¿'
```

Medições reais (spike concluído em 2026-09-23):
- Banco 12.2: `NLS_CHARACTERSET = WE8DEC`; o pdbseed é **plugado** pela imagem
  (`configDBora.sh` não permite escolher charset) e o **PDB herda o charset do
  CDB** — um PDB novo criado por `CREATE PLUGGABLE DATABASE` também saiu WE8DEC.
- Sessão thin: `DUMP('€')` = `Typ=1 Len=1: 191` → o `€` vira `¿` (0xBF).
- **`NLS_LANG` é irrelevante**: o node-oracledb thin usa **sempre AL32UTF8** e
  ignora `NLS_LANG`/NLS env vars; é o **servidor** que converte para o charset
  do banco (doc oficial node-oracledb). Testado: `AMERICAN_AMERICA.AL32UTF8`,
  `.UTF8` e pt-BR — todos degradam igual.
- Controle: o 23ai (`AL32UTF8`) devolve `226,130,172` (UTF-8 correto).

**Conclusão do spike**: a correção **não cabe à extensão** — depende do charset
do banco. O 12.2 da imagem Oracle é WE8DEC (perda silenciosa de caracteres fora
do charset). Portanto o suporte ao 12.2 fica restrito a bancos **AL32UTF8**
(ou sem caracteres não representáveis).

## 3. Objetivos / Não-objetivos

**Objetivos**
- Adicionar o 12.2 à matriz com **utPLSQL 3.1.14** (piso por versão de banco).
- Documentar a limitação de charset do 12.2 (WE8DEC) e tornar o teste de charset
  **version-aware** (skip documentado), em vez de falhar silenciosamente.
- Documentar o piso alternativo (12.2 → utPLSQL 3.1.x; 3.2.x → 18c+).

**Não-objetivos**
- Fazer o utPLSQL 3.2.x rodar no 12.2 (impossível sem mudar o framework).
- Corrigir o charset via extensão: o node-oracledb thin ignora `NLS_LANG` e o
  charset é do servidor (WE8DEC na imagem plugada) — **fora do alcance** do
  cliente. Fica registrado como limitação conhecida.
- Suportar 11g/12.1 (fora de escopo; mesmo tipo associativo do 12.2).
- Alterar o `decodeScript`/decodificação de arquivos (`win1252`/`latin1`) — o
  problema é a conversão no servidor, não a leitura local.

## 4. Requisitos

### RF1 — Piso alternativo de utPLSQL na matriz

`scripts/db-matrix/matrix.env`: adicionar campo opcional de versão do utPLSQL por
linha (4º campo), com fallback para `UTPLSQL_VERSION`:

```
VERSIONS="
12.2|container-registry.oracle.com/database/enterprise:12.2.0.1-slim|orclpdb1.localdomain|v3.1.14
18xe|container-registry.oracle.com/database/express:18.4.0-xe|XEPDB1|
19ee|container-registry.oracle.com/database/enterprise:19.3.0.0|orclpdb1|
21xe|container-registry.oracle.com/database/express:21.3.0-xe|XEPDB1|
23free|container-registry.oracle.com/database/free:23.26.3.0|FREEPDB1|
"
```

`run.sh` lê o 4º campo e exporta `UTPLSQL_VERSION` por versão.

### RF2 — Infra do 12.2 na matriz

- Suportar `DB_PLATFORM=linux/amd64` (já há) e o serviço com **DB_DOMAIN**
  (`orclpdb1.localdomain`) no `matrix.env`.
- `wait-ready.sh` já normaliza a senha do SYS via OS auth (a imagem 12.2 ignora
  `ORACLE_PWD` e usa `Oradoc_db1`); validar no `--smoke`.
- Bootstrap com `UTPLSQL_VERSION=v3.1.14` deve concluir (`utPLSQL ok`).

### RF3 — Charset (limitação documentada, sem correção no cliente)

O spike (2026-09-23) **encerrou** a hipótese de `NLS_LANG`: o node-oracledb thin
usa sempre AL32UTF8 e ignora NLS env vars; a conversão é do servidor. No 12.2 da
imagem o CDB é WE8DEC e o PDB herda. Portanto:

- **Não** definir `NLS_LANG` (não tem efeito).
- Documentar a limitação: 12.2 só preserva caracteres representáveis no charset
  do banco (AL32UTF8 recomendado). `€` em WE8DEC vira `¿`.
- Nenhuma mudança de runtime na extensão para charset (evita complexidade inútil).

### RF4 — Teste de integração do charset no 12.2

Tornar `charset win1252: çãõ € fazem round-trip` (PRD-62) **version-aware**:
detectar se o banco preserva o `€` (compara `DUMP`); se não preservar
(WE8DEC/legado), `this.skip()` com motivo explícito — em vez de falhar. Em
AL32UTF8 (18c+, e 12.2 configurado) valida normalmente.

**Não-funcionais**
- RNF1 — Nenhuma mudança de comportamento em bancos 18c+ (default inalterado).
- RNF2 — Nenhuma variável de ambiente nova nem vazamento de dados em logs.
- RNF3 — A matriz continua "uma versão por vez".

## 5. Solução proposta

### 5.1 `scripts/db-matrix/*`

- `matrix.env`: 4º campo de versão do utPLSQL + entrada `12.2`.
- `run.sh`: parse do 4º campo → `UTPLSQL_VERSION` por versão.
- `bootstrap.sh`: nada a mudar além de honrar a versão (já parametrizado).

### 5.2 Conexões da extensão

- **Nada** a alterar (o cliente thin não controla o charset; `NLS_LANG` é inócuo).

### 5.3 Documentação

- `README.md` (tabela de requisitos) + 23 variantes: 12.2 requer utPLSQL 3.1.x;
  3.2.x requer 18c+. Registrar a limitação de charset (banco legado/WE8DEC).
- `docs/wiki/Database-requirements.md`: matriz de compatibilidade
  banco × utPLSQL × extensão, com a nota de charset.

## 6. Configuração

Nenhuma setting nova. Sem `NLS_LANG`.

## 7. Plano de testes

- **Unitários**: parse do 4º campo do `matrix.env` (versão por linha; fallback);
  helper puro de detecção de suporte a `€` (a partir do `DUMP`) usado pelo teste.
- **Integração**: suíte completa no 12.2 com 3.1.14 (meta: verde, com o teste de
  charset em `skip` documentado); demais versões inalteradas.
- **Matriz**: `--only 12.2` e as 4 versões atuais.
- **Manual**: `runScript` com `€` no 12.2 round-trip.

## 8. Riscos e mitigação

| Risco | Mitigação |
|---|---|
| Charset legado (WE8DEC) no banco 12.2 corromper não-ASCII | Limitação documentada + teste de charset version-aware (skip); recomendação de AL32UTF8 no banco |
| Bootstrap do 12.2 lento (15–25 min do zero) | Volume persistente por versão (já existe) |
| utPLSQL 3.1.14 divergir de features (ex.: `get_suites_info` 3.1.3+) | Já coberto pelos gates de versão existentes (`UTPLSQL_MIN_VERSION`, PRD-74) |
| Flags novas no `matrix.env` quebrarem as versões atuais | 4º campo opcional com fallback para `UTPLSQL_VERSION` (coberto por teste unitário) |

## 9. Rollout

- Release **0.14.0**.
- `CHANGELOG.md`: suporte a Oracle 12.2 (utPLSQL 3.1.x) e limitação de charset.
- Matriz: `--only 12.2` documentado no `docs/wiki/Tests.md`/Contributing.

## 10. Critérios de aceite

- `npm run db:matrix --only 12.2` conclui com utPLSQL 3.1.14 e suíte verde
  (charset em `skip` documentado).
- O teste de charset permanece verde em 18c–23ai.
- `matrix.env` aceita versão por linha; demais versões usam `UTPLSQL_VERSION`.
- README/wiki documentam "12.2 → utPLSQL 3.1.x; 3.2.x → 18c+" e a limitação de
  charset.
- `docs:check`, `brain:check` e suíte unitária verdes.

## 11. Questões em aberto

- Vale recriar o PDB do 12.2 com AL32UTF8 (imagem sem `dbca` tornaria isso um
  trabalho manual) para remover a limitação de charset? (follow-up)
- Migrar a matriz para uma imagem 12.2 que permita `ORACLE_CHARACTERSET`?

## 12. Resultado do spike (2026-09-23)

- **`NLS_LANG` não tem efeito no thin** — descartada a RF3 original.
- **12.2 + utPLSQL v3.1.14**: bootstrap OK e integração 60 passing / 1 failing
  (apenas o teste de charset, que passa a ser version-aware).
- **12.2 + utPLSQL v3.2.3**: bootstrap falha (`PLS-00222`), como já documentado
  no `matrix.env`.
- Charset: `€` em WE8DEC → `¿`; em AL32UTF8 (23ai) → correto.
