<!-- GENERATED FROM docs/brain/20-PRDs/prd-123-oracle-11g-support.md — DO NOT EDIT -->

# PRD-123 — Suporte oficial ao Oracle 11g (11.2) em thick mode

| Campo | Valor |
|---|---|
| Status | Proposto |
| Autor | Gil Cleber Barboza |
| Data | 2026-10-17 |
| Componente | Compatibilidade (driver/conexão) + infra da matriz (local, não vai no VSIX) |
| Versão alvo | 0.18.0 |
| Arquivos afetados | `scripts/db-matrix/{matrix.env,run.sh,bootstrap.sh,parse-version.cjs}`, `docker/db-matrix/compose.yaml`, `.env.dbmatrix.example`, `src/discovery.ts`, `src/test/unit/{matrixConfig,discovery}.test.ts`, `.vscode-test.thick.mjs`, `src/test/integration/thickLegacyE2E.test.ts` (novo), `docs/brain/60-README/README (extensão).md` (+ 23 variantes geradas), `docs/brain/70-Wiki/{Database-requirements,Contributing,Tests,Troubleshooting}.md`, `docs/brain/10-Projeto/Funcional/10-development-tooling.md`, `docs/brain/80-Site/Landing page (site).md`, `docs/brain/15-Regras/BR-TEST-001*.md`, `docs/brain/14-NFR/NFR-001*.md`, `CHANGELOG.md` |
| Esforço estimado | 2–3 dias |
| Complexidade | Média-Alta |
| Relaciona-se a | PRD-72 (matriz de bancos), PRD-84 (12.2 + piso alternativo), PRD-70 (thick opt-in), NFR-001, BR-TEST-001, BR-CONN-012 |

## 1. Resumo

Declarar e **validar em banco real** o suporte ao **Oracle 11g (11.2)** — o legado
ainda comum em campo — restrito ao **thick mode**: o `node-oracledb` 7 **não conecta
em 11.2 em thin** (piso 12.1, `NJS-138`) e a única imagem 11g executável é o **XE
11.2.0.2** (Docker Hub/`gvenzl` — não existe no registry Oracle). A PRD adiciona a
entrada `11xe` à matriz local (utPLSQL `v3.1.14`, cobertura via `DBMS_PROFILER`),
corrige o construto **12c+ que degrada silenciosamente** no 11g
(`FETCH FIRST` em `discovery.ts`), torna o bootstrap compatível (sem `INHERIT
PRIVILEGES`) e atualiza a declaração de suporte: README ×24, badge, wiki, site e
regras (`BR-TEST-001`, `NFR-001`, `BR-CONN-019`).

## 2. Contexto e problema

### 2.1 O thin não alcança o 11g — por construção

Tabela oficial do node-oracledb (*Thin × Thick*): thin conecta em **Oracle Database
12.1+**; thick em **11.2+**, porém o **node-oracledb 7 exige Oracle Client 19c ou
superior** (versões anteriores do driver aceitavam clients antigos). Ou seja: hoje o
usuário com 11g recebe `NJS-138` e **não há caminho documentado** — o caminho existe
(`utplsql.oracleClientMode: thick`, PRD-70), mas não é declarado nem testado.

### 2.2 Não há imagem 11g no registry Oracle

Testado: `container-registry.oracle.com/database/express:11.2.0.2-xe` →
*no such manifest* (o registry tem 12.1.0.2 EE, 18c/21c XE, 19c EE e 23ai, mas **não
11g**). A opção prática é `docker.io/gvenzl/oracle-xe:11-slim` (11.2.0.2 XE), com
diferenças que a matriz hoje **não modela**:

- senha na env **`ORACLE_PASSWORD`** (as imagens Oracle usam `ORACLE_PWD`);
- datafiles em **`/u01/app/oracle/oradata`** (as demais em `/opt/oracle/oradata`);
- serviço do listener é **`XE`** — 11g **não tem PDB** (multitenant é 12c+).

### 2.3 O utPLSQL suporta; o nosso bootstrap não está pronto

- O utPLSQL **3.1.x declara suporte a 11g R2, inclusive XE** (o 3.2.x exige 18c+; o
  12.2 já usa o piso alternativo `v3.1.14`). Cobertura em <12.2 é via
  **`DBMS_PROFILER`** (`DBMS_PLSQL_CODE_COVERAGE` é 12.2+) — os grants já existem no
  `bootstrap.sh`.
- `GRANT INHERIT PRIVILEGES ON USER …` (`create_test_schema`) é **12c+** → erro no
  11g (hoje passa batido porque a saída do sqlplus não é checada).
- `src/discovery.ts` usa **`FETCH FIRST ${n} ROWS ONLY`** (12c+) **dentro de um
  `try` com fallback silencioso** (comentário "ALL_SOURCE inacessível"): no 11g a
  descoberta DB-first simplesmente **não encontra pacotes, sem erro visível**. É o
  tipo de bug que a matriz existe para pegar.

### 2.4 O limite real do client novo é empírico

A matriz de interoperabilidade da Oracle (nota 207303.1) lista o client **19c** com
suporte (MDS) ao servidor **11.2.0.4**, e clients 23ai sem suporte declarado a
servidores <19c. Porém o projeto **já opera combinações fora da matriz** (Instant
Client 23.0 contra o 12.2 XE passa no eixo thick). O 11g XE é **11.2.0.2** — mais
antigo que o 11.2.0.4 da matriz — e o comportamento real do client novo contra ele
(`ORA-03134`?) precisa ser **medido**, não presumido: é o RF0.

### 2.5 O contrato de compatibilidade hoje é 12.2–23ai

A PRD-72 registrou "suportar 11.2/12.1" como não-objetivo; a PRD-84 adicionou o 12.2
com piso alternativo de utPLSQL. `BR-TEST-001` e `NFR-001` documentam o piso **12.2+**
e a validação thin/thick nas cinco versões. Falta o degrau mais antigo — e o
`node-oracledb` 7 não permite fazê-lo em thin.

## 3. Objetivos / Não-objetivos

**Objetivos**
- **Spike go/no-go** (RF0): o Instant Client moderno conecta no 11.2.0.2? O
  resultado define o resto do escopo (e fica registrado na nota, como o §12 da
  PRD-84).
- Adicionar a entrada **`11xe`** à matriz com **modo de cliente explícito**
  (`thick-only`) e guarda *fail-fast* para rodar o eixo certo.
- Tornar o caminho **thick + 11.2 funcional de ponta a ponta**: execução real
  (streaming de resultados) e **cobertura via `DBMS_PROFILER`** validadas em E2E.
- Corrigir os construtos **12c+** do código que degradam no 11g, **sem regressão
  em 12.1+**.
- Declarar o suporte de forma consistente: README ×24 (badge + tabela de
  compatibilidade), wiki (`Database-requirements`, `Troubleshooting`, `Tests`,
  `Contributing`), site e regras do cérebro.

**Não-objetivos**
- **Thin no 11g** (impossível: piso 12.1 do driver) e uso de client <19 (o
  node-oracledb 7 exige 19c+).
- Subir a matriz ao CI (imagens de GB; decisão da PRD-72 permanece).
- **12.1** nesta PRD (é alcançável em thin e há imagem no registry — fica como
  candidato nas questões em aberto).
- Alterar o `UTPLSQL_VERSION` default (`v3.2.3`); o 11g usa piso por versão, como o
  12.2.
- Mensagens novas de UI/i18n para `NJS-138`/`ORA-03134` (follow-up; custo ×24
  locales).

## 4. Requisitos

### RF0 — Spike de viabilidade do client (go/no-go)

- Subir `gvenzl/oracle-xe:11-slim` e executar, **com o Instant Client local**, um
  `getConnection` do node-oracledb 7 em **thick mode** → `SELECT 1 FROM dual`.
- Registrar o resultado (versão do IC; erro, se houver) na própria nota.
- **Decisão:** conectou → seguir o plano; `ORA-03134`/`NJS-*` →
  **parar** e reavaliar (o 11g continua documentado como “não suportado pelo
  driver”; avaliar 12.1 na matriz e/ou um client 19c dedicado para bancos 11.2.0.4+
  de produção). O spike não bloqueia o resto da PRD ficar pronta para reavaliação.

### RF1 — Entrada `11xe` na matriz com modo de cliente

- `scripts/db-matrix/matrix.env`: novo **5º campo opcional** `client`
  (`both` default | `thick`) e a linha:

  ```
  11xe|docker.io/gvenzl/oracle-xe:11-slim|XE|v3.1.14|thick
  ```

- `parse-version.cjs` (e o teste unitário) passam a normalizar o 5º campo;
  `run.sh --list` anota `(thick-only)`.

### RF2 — Compose/bootstrap paramétricos por versão

- `compose.yaml`: **`DB_DATA_DIR`** (default `/opt/oracle/oradata`; 11g →
  `/u01/app/oracle/oradata`) e env de senha **`ORACLE_PASSWORD`** além de
  `ORACLE_PWD` (cada família de imagem lê a sua).
- `bootstrap.sh`: **guardar `INHERIT PRIVILEGES`** (12c+) com o padrão
  `try_grant`-like; caminho absoluto do datafile de `USERS` derivado do
  `DB_DATA_DIR`; manter os grants de `DBMS_PROFILER`; a verificação
  (`ut3.ut.run('test_math')` → `0 failed, 0 errored`) é o gate.
- `matrix.env`: comentários `OBS 5` documentando 11g (imagem de terceiro, thin
  impossível, serviço `XE` sem PDB, `DBMS_PROFILER`).

### RF3 — Guarda fail-fast no orquestrador

- `run.sh`: versão com `client=thick` **recusa** qualquer comando de teste que não
  seja o eixo thick (mensagem: “11xe só roda com `--thick`; thin exige 12.1+”).
  `--smoke`/suíte default em 11g → erro imediato, não `NJS-138` depois do bootstrap.

### RF4 — Portabilidade do SQL da extensão (11.2)

- `src/discovery.ts`: trocar `FETCH FIRST … ROWS ONLY` por forma portátil
  (`SELECT … FROM (… ORDER BY line) WHERE ROWNUM <= :max`) — comportamento
  idêntico em 12.1+ e funcional em 11.2.
- **Auditoria** dos demais acessos (`ALL_ERRORS`, `ALL_SYNONYMS`, `ALL_SOURCE`,
  `V$SQL`, `DBMS_DEBUG`, buffer de saída) — os conhecidos são 11.2-compatíveis;
  registrar o que foi conferido.
- Teste unitário do SQL portátil (sem `FETCH FIRST`) + teste do caminho de
  fallback.

### RF5 — Validação E2E no 11g (eixo thick ampliado)

- O eixo thick hoje roda só `thickMode.test.ts` (2 testes) — insuficiente para
  declarar suporte. Novo **`thickLegacyE2E.test.ts`** (gated por
  `UTPLSQL_THICK_TEST=1` + `UTPLSQL_THICK_CONN`): executa o caminho canônico
  (`executeRunOracle` com streaming, `applyResultsFromCases`/`countResults`) e uma
  **coleta de cobertura Cobertura** contra o banco do eixo thick; assertiva de
  `0 failed` e do XML de cobertura.
- `.vscode-test.thick.mjs` passa a incluir os dois arquivos; o teste novo **skips**
  sem `UTPLSQL_THICK_CONN` (não quebra o run thick local sem matriz).

### RF6 — Documentação de suporte (vault-first)

- **README (nota canônica + 23 variantes geradas)**: tabela de compatibilidade com
  a linha **11.2 (11g R2)** — `v3.1.x`, **thick obrigatório** (thin 12.1+),
  cobertura via `DBMS_PROFILER`; badge/claim coerente com a decisão das questões em
  aberto.
- **Wiki**: `Database-requirements` (matriz banco × utPLSQL × cliente × cobertura),
  `Troubleshooting` (`NJS-138` → use thick; `ORA-03134` → client incompatível),
  `Tests`/`Contributing` (comandos da matriz com a nova entrada).
- **Funcional** `10-development-tooling.md` (tabela da matriz) e **site**
  (claim "Oracle Database 12.2 or newer" → decisão de badge/claim).
- `.env.dbmatrix.example`: **`ORACLE_CLIENT_LIB_DIR_<LABEL>`** (ex.:
  `ORACLE_CLIENT_LIB_DIR_11XE`) para apontar um Instant Client compatível só daquela
  versão; `run.sh` prefere o sufixo antes do `ORACLE_CLIENT_LIB_DIR` global.

### RF7 — Regras e rollout

- Atualizar **`BR-TEST-001`** (título/enunciado: matriz cobre 11.2–23ai; 11.2
  thick-only) e **`NFR-001`** (piso 11.2 com thick; tabela de validação); criar
  **`BR-CONN-019`** (“11g exige thick; thin tem piso 12.1”) com `prds: ["PRD-123"]`,
  `implementacao:` e `testes:`.
- `CHANGELOG.md` (seção da versão) e release pela skill `release`.

**Não-funcionais**

- RNF1 — **Zero mudança de comportamento em 12.1+**: o fix de portabilidade é de
  sintaxe; a matriz thin atual (12.2/18xe/19ee/21xe/23free) segue verde.
- RNF2 — **11g é thick-only por desenho**: nenhum caminho cai em thin
  silenciosamente; erro claro quando o eixo está errado.
- RNF3 — **Infra local** (nada no VSIX, nada no CI); imagem 11g fixada por
  **digest** (terceiro no Docker Hub) no `matrix.env`/doc.
- RNF4 — **Paridade documental**: só o vault é editado; `brain:build`, `docs:check`,
  `brain:rules` e `brain:check` verdes.
- RNF5 — **Custo de execução**: uma versão por vez, volume por versão, imagem slim
  (download único de ~2–4 GB).

## 5. Solução proposta

### 5.1 Matriz (`scripts/db-matrix/matrix.env`)

```
VERSIONS="
12.2|container-registry.oracle.com/database/enterprise:12.2.0.1-slim|orclpdb1.localdomain|v3.1.14
11xe|docker.io/gvenzl/oracle-xe:11-slim|XE|v3.1.14|thick
18xe|container-registry.oracle.com/database/express:18.4.0-xe|XEPDB1
19ee|container-registry.oracle.com/database/enterprise:19.3.0.0|orclpdb1
21xe|container-registry.oracle.com/database/express:21.3.0-xe|XEPDB1
23free|container-registry.oracle.com/database/free:23.26.3.0|FREEPDB1
"
```

### 5.2 Infra

`DB_DATA_DIR` + `ORACLE_PASSWORD` no compose; `bootstrap.sh` com `INHERIT
PRIVILEGES` guardado e datafile em `$DB_DATA_DIR`; `run.sh` com a guarda do 5º campo
e o override de client por versão (RF6). O `wait-ready.sh` já checa
`v$database` READ WRITE (vale para SID único) — só a mensagem menciona PDB
(cosmético, opcional).

### 5.3 Driver/código

O 11g é exercitado **exclusivamente** pelo `oracleClientMode: thick` (PRD-70) — a
extensão já inicializa o client nesse modo. O único construto 12c+ conhecido no
código é o `FETCH FIRST` (RF4); o restante é auditado e coberto pelo E2E novo
(RF5), que passa a valer para **todas** as versões do eixo thick.

### 5.4 Alternativa se o RF0 falhar

1. Manter o 11g declarado como **não suportado pelo driver** (documentar `NJS-138`/
   `ORA-03134` no Troubleshooting) e **validar o 12.1** na matriz (registry, thin +
   thick, utPLSQL `v3.1.14`) como o legado alcançável de ponta a ponta.
2. Ou usar um **Instant Client 19c dedicado** para o 11g — válido para bancos
   **11.2.0.4+** (MDS), mas **não validável na matriz** (não há imagem 11.2.0.4).

## 6. Configuração

- **Nenhuma setting nova** da extensão. Para o 11g: `utplsql.oracleClientMode:
  thick` + `utplsql.oracleClientLibDir` (ambas da PRD-70).
- Matriz: `ORACLE_CLIENT_LIB_DIR_11XE` (opcional, `.env.dbmatrix`) e `DB_DATA_DIR`
  (interno do compose).

## 7. Plano de testes

- **Unitários**: parse do 5º campo (`matrixConfig.test.ts`, `parse-version.cjs`);
  SQL portátil do `discovery` (sem `FETCH FIRST`; fallback preservado);
  `scriptsCli.test.ts`.
- **Integração (eixo thick)**: `npm run db:matrix -- --only 11xe --thick` →
  `thickMode` (2) + `thickLegacyE2E` (novo: execução real + cobertura profiler).
- **Matriz completa**: `npm run db:matrix` (thin, 5 versões atuais) continua verde;
  `--thick` verde nas **6** (incluindo 12.2, que já roda thick).
- **Documentação**: `npm run brain:ci`, `docs:check`, `brain:rules`, `brain:check`.
- **Manual**: `NJS-138` reproduzido em thin contra o 11g (documentado no
  Troubleshooting) e caminho feliz em thick.

## 8. Riscos e mitigação

| Risco | Mitigação |
|---|---|
| IC 23.0 não conecta no 11.2.0.2 (`ORA-03134`) | **RF0** decide antes do resto; fallback §5.4 (12.1 na matriz / 11.2.0.4 com client 19c) |
| node-oracledb 7 exige client 19+ (não há como usar client 11.2) | é premissa do RF0; sem client compatível o 11g fica documentado como limite do driver |
| Imagem `gvenzl` é de terceiro | pin por digest + origem documentada; alternativa: build próprio do RPM público do XE |
| Charset do XE 11.2 desconhecido (`WE8MSWIN1252`?) | medir no spike; o teste de charset do v012 já é **version-aware** (skip documentado) |
| `INHERIT PRIVILEGES`/12c+ no bootstrap | RF2: guardado; bootstrap falha alto (`set -e` + gate de objetos) |
| Combinação fora da matriz de interoperabilidade da Oracle | suporte declarado como **best-effort com thick**, com o gate sendo a matriz local (RNF2/RNF3); nota no Troubleshooting |
| Blast radius de docs (24 variantes) | RNF4: vault-first + `brain:build`; nada editado à mão |
| Limites do XE 11.2 (11 GB de dados) | fixtures pequenos; volume dedicado por versão |

## 9. Rollout

- Release **0.18.0** (fundação/testes; pode ser antecipada para a 0.17.0 — ver
  questões em aberto).
- `CHANGELOG.md`: suporte a Oracle 11g (thick-only, utPLSQL 3.1.x) + portabilidade
  do SQL de descoberta.
- Matriz: `--only 11xe --thick` documentado na wiki (Contributing/Tests).
- Release pela skill `release` (GitHub release → `publish.yml`).

## 10. Critérios de aceite

- Resultado do **RF0** registrado na nota (go/no-go + versão do Instant Client).
- `npm run db:matrix -- --only 11xe --thick` **verde** (thickMode + thickLegacy)
  com o Instant Client compatível; recusa clara sem `--thick`.
- `npm run db:matrix` segue **verde** nas 5 versões atuais (thin) e `--thick` verde
  nas 6.
- `discovery.ts` sem `FETCH FIRST`, com teste unitário; descoberta DB-first
  funcional no 11g (coberta pelo E2E).
- README (24 variantes) + wiki + site declaram 11.2/thick, o piso thin (12.1+) e a
  cobertura por `DBMS_PROFILER`.
- `BR-TEST-001`, `NFR-001` e `BR-CONN-019` atualizados/criados com vínculo
  bidirecional (`brain:rules` verde) e `CHANGELOG.md` com a entrada.

## 11. Questões em aberto

- **RF0**: o Instant Client 23.0 conecta no 11.2.0.2? Se não, o escopo vira §5.4
  (12.1 na matriz; 11g no Troubleshooting)?
- **Versão alvo**: 0.18.0 (fundação/testes) ou antecipar para a 0.17.0?
- **Badge/claim**: piso “11.2+ (thick)” no badge/README/site, ou manter “12.2+” e
  anunciar o 11g apenas na tabela de compatibilidade?
- **Pin da imagem** `gvenzl/oracle-xe:11-slim` por digest?
- Mensagem amigável para `NJS-138`/`ORA-03134` (custo i18n ×24) — vale nesta PRD ou
  follow-up?
- Incluir **12.1** (registry, thin + thick) na mesma leva, agora que a infra da
  matriz terá o campo de modo de cliente?

## 12. Impacto no cérebro

Na conclusão:

- **Atualizar `BR-TEST-001`** — enunciado passa a cobrir **11.2–23ai** (11.2
  thick-only; piso alternativo utPLSQL `v3.1.14` para 11.2/12.2) e o `implementacao:`
  ganha `parse-version.cjs`; `prds:` recebe `PRD-123`.
- **Atualizar `NFR-001`** — piso **11.2** com thick e thin a partir de 12.1; a
  tabela de validação ganha a linha do 11g (thin: n/a — driver; thick: N passing);
  `requisitos:` recebe `PRD-123/RF0`, `PRD-123/RF5`.
- **Criar `BR-CONN-019`** — “Oracle 11g (11.2) exige thick mode; o thin do
  node-oracledb tem piso 12.1” — com `prds: ["PRD-123"]`, `implementacao:`
  (`src/oracleClient.ts`, `scripts/db-matrix/matrix.env`, docs) e `testes:`
  (`thickLegacyE2E.test.ts`, `thickMode.test.ts`); referenciada no doc
  funcional/wiki (`Database-requirements`).
- RNFs sem regra: nenhuma (todas as RNF têm alvo em regra/NFR).

Enquanto `proposed`, `regras: []` (derivado pelo `brain:sync` na conclusão).
