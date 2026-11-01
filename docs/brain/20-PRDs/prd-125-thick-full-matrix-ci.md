---
tipo: prd
id: PRD-125
aliases: [PRD-125]
status: in-progress
titulo: "Suíte completa em thick e matriz de bancos no CI"
versao: "0.19.0"
data: "2026-10-29"
autor: "Gil Cleber Barboza"
versao_titulo: "0.19.0 — Piso Node 24 e runtime moderno"
verificado: "2026-10-31"
regras: ["BR-TEST-001"]
docs: ["CHANGELOG", "wiki/Contributing.md", "wiki/Tests.md", "functional/10-development-tooling.md"]
tags: [prd]
---

# PRD-125 — Suíte completa em thick e matriz de bancos no CI

| Campo | Valor |
|---|---|
| Autor | Gil Cleber Barboza |
| Data | 2026-10-29 |
| Componente | Testes de integração + matriz de bancos + CI |
| Versão alvo | 0.19.0 |
| Arquivos afetados | `.vscode-test.thick-full.mjs` (novo), `scripts/db-matrix/run.sh`, `package.json`, `.github/workflows/integration.yml`, `src/test/integration/**` (skips condicionais), `docs/brain/70-Wiki/{Contributing,Tests}.md`, `docs/brain/15-Regras/BR-TEST-001*.md`, `docs/brain/10-Projeto/Funcional/10-development-tooling.md`, `CHANGELOG.md` |
| Esforço estimado | 2–3 dias |
| Complexidade | Média-Alta |
| Relaciona-se a | PRD-123 (11g thick), PRD-124 (driver 26), PRD-72/84 (matriz), PRD-04 (testes), BR-TEST-001, BR-CONN-019 |

## 1. Resumo

Hoje o eixo **thick** roda só **4 testes** (`thickMode` + `thickLegacyE2E`) e o
**11g — o único banco sem thin — é validado apenas nesse smoke**. A suíte
completa (119 + 6 multiroot) roda em thin no 23free; a matriz 18c/21c/23ai é
apenas `workflow_dispatch`. Esta PRD cria a **suíte completa em thick**
(`--thick-full`), valida no 23free e no 11g com uma lista explícita de skips, e
torna a matriz/full parte do fluxo de CI (release e caminhos críticos).

> **Revisão (2026-10-31):** o **RF1/RF2 já foram entregues** no commit
> `cd0fa51`: `.vscode-test.thick-full.mjs`, scripts `test:integration:thick-full`,
> `run.sh --thick-full`, teste em `matrixConfig.test.ts` e docs. O que resta é a
> **validação 23free/11g**, o ajuste do `thickMode.test` (ele reinicializa o
> cliente e falha num host já thick) e a **política de CI** (RF4).

## 2. Contexto e problema

### 2.1 O eixo thick é um smoke, não uma suíte

- `.vscode-test.thick.mjs` lista apenas `thickMode.test.js` (2 testes) e
  `thickLegacyE2E.test.js` (2).
- `run.sh --thick` aponta para `npm run test:integration:thick`.
- O 11g (`11xe`) é forçado para `--thick`; logo, a matriz do 11g = **4 passing**.
- `--full` é thin-only; `--full --thick` não combina (a última flag vence e a
  guarda do 11g rejeita).
- Não há teste do **thick completo** em nenhum banco (nem no 23free).

### 2.2 O full não é o padrão no PR

- PR padrão roda **smoke** (17 testes: capacidades + debugger + v017).
- Full só com label `run-integration` ou no nightly (23free).
- A matriz 18c/21c/23ai (`integration.yml`) é `workflow_dispatch`; não roda em
  PR nem por agenda.
- O `--thick` no 23free/21xe (quando usado) também é só o smoke de 4 testes.

### 2.3 Consequência

O 11g é vendido como suportado (PRD-123), mas só o caminho feliz
(run/cobertura/discovery de `test_math`) é exercitado. Debugger, pool,
cancelamento, schema mode, tags, profile/SecretStorage, jump-to-failure e
multiroot não têm cobertura no thick — e o driver 26 (PRD-124) aumenta o risco.

### 2.4 Validação (2026-10-31 / 2026-11-01)

Diagnóstico do `--thick-full` no 23free com `oracledb@26`:

- **UI/comandos** (`extension`, `commandsE2E`): falham/hangam no
  `.code-workspace` temporário porque dependem do workspace/settings do repo;
  são cobertos pelo eixo thin. **Não é bug do produto.**
- **`thickMode`**: reinitializa o cliente num host que já está thick
  (`already initialized`); o teste continua válido no eixo thick isolado.
- **`debuggerStandaloneFn`**: falha no thick (function standalone/toplevel);
  limitação registrada.
- **`debuggerE2E`/`debuggerExceptionE2E`**: falham de forma **intermitente** no
  run completo com `NJS-500`/`ORA-12547` (conexão fechada/perdida), mas
  **passam isolados**. O banco está saudável (93/200 processes, 121/322
  sessions), então não é limite de sessão evidente.
- **`schemaRun` (cancelamento), `tagsStreaming`, `thickLegacyE2E`,
  `v012`/`v013`/`v014`**: **passam isolados**; as falhas do run anterior eram
  cascata do host/estado, não determinísticas.
- Com as exclusões explícitas, o full thick no 23free **completou uma vez em
  ~5 min** com **79 passing / 8 pending / 4 failing** (os 3 debugger +
  `profileSecretStorage`, todos por conexão/estado); em outra execução o host
  ficou instável e o run hangou.
- O eixo **thick smoke** (4 testes: thickMode + thickLegacyE2E) continua verde
  no 11g e no 23free com o driver 26; o **11g full** não foi tentado (timebox).

**Decisão:** entregar o que é independente e estável — o eixo `--thick-full`
com exclusões explícitas, a **política de CI** (RF4) e a documentação — e manter
o thick-full **experimental**. A suíte completa em thick (RF3) fica para a
**0.20.0**, com a estabilidade de conexão/pool do host longo instrumentada
(PRD-101/PRD-102; issue **#288**) e os testes UI/standalone separados. A PRD
permanece `in-progress` (parcial); o 0.19.0 não promete a suíte completa em
thick.

## 3. Objetivos / Não-objetivos

**Objetivos**
- Rodar a **suíte completa em thick** no 23free e no 11g.
- Criar o eixo `--thick-full` no `run.sh` e o script
  `test:integration:thick-full`.
- Explicitar (e testar) os **skips** de testes thin-only no thick.
- Levar o full para PRs de `release/**` e caminhos críticos; agendar a matriz
  pública (18xe/21xe/23free).
- Registrar a evidência no resumo da matriz e no CHANGELOG.

**Não-objetivos**
- Instalar Instant Client no runner do GitHub Actions nesta PRD (avaliar à
  parte; o eixo CI thick é opcional).
- Rodar multiroot em thick (pode ser uma extensão futura; o foco é a suíte
  principal).
- Adicionar 26ai/12.1 à matriz (PRD-124/123 tratam dos pisos).
- Corrigir eventuais incompatibilidades do utPLSQL 3.1 no 11g além dos skips
  documentados.

## 4. Requisitos

### RF1 — Config e script `thick-full`

Criar `.vscode-test.thick-full.mjs` com:

- workspace temporário `.code-workspace` apontando para a raiz do repo e
  settings `utplsql.oracleClientMode: thick` + `utplsql.oracleClientLibDir`;
- `UTPLSQL_CONN`/`UTPLSQL_THICK_CONN` vindos do ambiente (sem thin antes do
  thick);
- todos os `out/test/integration/**/*.test.js`, exceto os thin-only explícitos
  (`prd70-sqlplus` — afirma thin default; `v014-tns` — TNS thin) e o
  **`thickMode.test.js`** — ele faz `resetOracleClientStateForTests()` e chama
  `initOracleClient` de novo; num host que já inicializou thick na ativação o
  driver acusa “already initialized”. O teste continua válido no
  `.vscode-test.thick.mjs` isolado;
- `package.json`: `pretest:integration:thick-full` (clean/compile/bundle) e
  `test:integration:thick-full` — **já entregues**.

### RF2 — `run.sh --thick-full`

Adicionar a flag, atualizar a ajuda e a guarda do 11g (ela já aceita
`*test:integration:thick*`). O `--thick-full` não deve rodar multiroot nesta
PRD; o `--full` thin continua incluindo.

### RF3 — Validar no 23free e no 11g

- 23free: full thick (todos os testes não thin-only) — base para separar
  “thick funciona” de “quirks do 11g”.
- 11g: full thick com `utPLSQL 3.1.14`; criar uma lista de skips condicional
  (por env `UTPLSQL_LEGACY=1` ou detecção da versão do banco) para o que não
  existe no 11g/3.1, documentando cada skip. **Timebox de 1 dia**; se a suíte
  for estruturalmente incompatível, registrar a limitação e manter o 11g no
  smoke (previsto no Rollout).
- Medir tempo e registrar no resumo da matriz.

### RF4 — CI

- **Full no PR** quando a base for `release/**` ou quando o PR tocar
  `src/oracleRunner.ts`, `src/results.ts`, `src/discovery.ts`, `src/runner.ts`
  ou `src/scriptRunner.ts` (detecção por `git diff` no `integration.yml`; o
  workflow já roda em todo PR, então o passo “Decide scope” escolhe full vs
  smoke).
- **Matriz agendada**: 18xe/21xe **smoke** no semanal; o **23free full** já roda
  no nightly existente. 19ee/12.2/11g continuam locais (credenciais/imagem).
- Manter o label `run-integration` como escape manual para o full em qualquer
  PR.

### RF5 — Docs e CHANGELOG

- `wiki/Contributing.md`: comandos `--thick-full` e a política de CI.
- `wiki/Tests.md`: eixo thick-full e skips.
- `wiki/Database-requirements.md`: o que o 11g cobre (se mudar).
- `CHANGELOG.md`: 0.19.0.

### RF6 — Regras

Atualizar **`BR-TEST-001`** (a matriz inclui o eixo thick-full e o 11g deixa de
ser só smoke) e **`BR-CONN-019`** (se o piso de Client/11g mudar). Criar regra
nova só se a política de CI precisar de um invariante próprio.

**Não-funcionais**
- RNF1 — O full thick no 23free não deve exceder ~2× o full thin no mesmo
  banco (ou ~10 min), excluindo o bootstrap.
- RNF2 — Nenhuma dependência nova.
- RNF3 — Skips determinísticos e documentados (nada de “flaky skip”); incluir o
  `thickMode.test` na lista de exclusão do `thick-full` com o motivo de
  inicialização global.
- RNF4 — O eixo thin continua verde e com os mesmos 119 + 6.

## 5. Solução proposta

1. Criar o config/script e rodar no 23free; ajustar a lista de exclusões.
2. Rodar no 11g; para cada falha, decidir: correção, skip condicional ou
   limitação documentada do 11g/3.1.
3. Adicionar `--thick-full` ao `run.sh` e a evidência ao resumo.
4. Ajustar o `integration.yml` (full em release/caminhos críticos + matriz
   agendada).
5. Atualizar docs/regras/CHANGELOG.

## 6. Configuração

Nenhuma setting/comando de runtime novo. Apenas scripts de teste e CI.

## 7. Plano de testes

- **Unitários**: `matrixConfig.test.ts` cobre `--thick-full`, o guard do 11g e a
  config (arquivos excluídos); `packageTarget` inalterado.
- **Integração**: full thick no 23free e no 11g; full thin no 23free (regressão).
- **CI**: PR de release/caminho crítico roda full; matriz agendada verde.
- **Manual**: `run.sh --only 23free --thick-full` e
  `--only 11xe --thick-full` com Instant Client 23.0.

## 8. Riscos e mitigação

| Risco | Mitigação |
|---|---|
| Full thick no 11g expõe muitas falhas de 3.1/11g | Skips condicionais documentados; o que for bug real vira issue/PRD |
| Tempo do full thick no CI | Rodar só em release/caminhos críticos; matriz com smoke nos demais |
| Workspace temporário não aplicar settings | Validar `readConfig` no host; fallback para fixture versionada |
| Thin default quebrar no host thick | `prd70-sqlplus` fica fora; teste dedicado de thin continua no eixo thin |
| Flakiness | Timeouts do mocha e skips determinísticos; sem dependência de ordem |

## 9. Rollout

- **Release alvo:** 0.19.0.
- `CHANGELOG` com o novo eixo e a política de CI.
- Se o 11g não puder rodar o full, a PRD entrega o `thick-full` no 23free e
  documenta o 11g como smoke (com a justificativa), sem regredir a promessa
  atual.

## 9.1 Entrega parcial (2026-10-31)

O 0.19.0 entrega o **RF1/RF2** (config/scripts), o **RF4** (CI) e a documentação;
o **RF3** (full 23free/11g) fica para a **0.20.0**. Critérios de aceite abaixo
marcados como pendentes não bloqueiam a 0.19.0; a PRD fica `in-progress`.

O cron semanal (`0 4 * * 0`) só passa a valer depois do merge na `main`
(workflows agendados rodam a partir da default branch). Antes disso, o recorte
do semanal (18c/21c em smoke) pode ser exercitado pelo dispatch `matrix-smoke`.

## 10. Critérios de aceite

- `run.sh --thick-full` executa a suíte completa (menos thin-only e
  `thickMode.test`) no 23free.
- O 11g executa o full thick com skips documentados (ou a limitação registrada).
- `npm run test:integration:thick-full` funciona com `UTPLSQL_CONN` +
  `ORACLE_CLIENT_LIB_DIR`.
- CI: full em `release/**`/caminhos críticos; matriz agendada 18xe/21xe/23free.
- `brain:ci`, `docs:check`, `version:check` verdes; `BR-TEST-001` atualizada.
- Nenhuma regressão no eixo thin (119 + 6).

## 11. Questões em aberto

- ~~Vale manter o 11g no full thick com skips ou aceitar o smoke atual?~~
  **Decidido (2026-10-31):** tentar o full com timebox de 1 dia; se não fechar,
  smoke documentado (o Rollout já permite).
- O full thick deve incluir multiroot? **Decidido:** não nesta PRD (o `multiRootE2E`
  faz skip em single-root).
- Instalar Instant Client no CI (RPM/zip) para tornar o thick obrigatório?
  **Adiado:** o eixo CI thick é opcional nesta PRD.
- A matriz agendada deve ser diária ou semanal? **Decidido:** semanal para
  18xe/21xe (smoke); o 23free full continua nightly.

## 12. Impacto no cérebro

Atualizar **`BR-TEST-001`** (matriz cobre thick-full e o 11g deixa de ser só
smoke; ou registra a limitação se o full não fechar) e **`BR-CONN-019`** somente
se o requisito de Client/11g mudar. RNFs sem regra: RNF1 (tempo), RNF2 (sem dep
nova), RNF3 (determinismo), RNF4 (regressão thin) — verificadas pelo próprio CI.
O RF1/RF2 já está no código; a nota só precisa refletir o estado.

## Impacto nas docs

`wiki/Contributing.md`, `wiki/Tests.md` e
`functional/10-development-tooling.md` ganham `--thick-full` (experimental) e a
política de CI; `CHANGELOG` registra na 0.19.0. Na conclusão, cada superfície
cita `PRD-125` ou `<!-- prd:PRD-125 -->`.

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - PRDs]]
- 📐 Regras: [[BR-TEST-001 - Matriz de bancos Oracle cobre 12.2-23ai em thin e thick|BR-TEST-001]]
- 🔗 PRDs relacionados: [[prd-04-expand-tests|PRD-04]] · [[prd-72-db-test-matrix|PRD-72]] · [[prd-101-connection-pool-lifecycle|PRD-101]] · [[prd-102-trace-and-perf-instrumentation|PRD-102]] · [[prd-123-oracle-11g-support|PRD-123]] · [[prd-124-oracledb-26-upgrade|PRD-124]]
- ⚙️ Pipelines: [[PIPE-integration - Integration (Oracle)|PIPE-integration]]
- 🎯 RF4 — CI → [[BR-TEST-001 - Matriz de bancos Oracle cobre 12.2-23ai em thin e thick|BR-TEST-001]]
- 🚀 ⬅️ release anterior: [[prd-123-oracle-11g-support|PRD-123 (0.18.0)]] · ➡️ próxima release: [[prd-101-connection-pool-lifecycle|PRD-101 (0.20.0)]]
<!-- brain:auto:end -->
