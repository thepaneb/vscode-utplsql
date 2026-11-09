<!-- GENERATED FROM docs/brain/20-PRDs/prd-150-thick-full-true-pool-recovery.md — DO NOT EDIT -->

# PRD-150 — Thick-full verdadeiro: inicialização thick e recuperação do pool após break

| Campo | Valor |
|---|---|
| Status | Concluído |
| Autor | Gil Cleber Barboza |
| Data | 2026-11-07 |
| Componente | Testes de integração + matriz de bancos + `oracleRunner` |
| Versão alvo | 0.20.1 |
| Arquivos afetados | `.vscode-test.thick-full.mjs`, `src/test/integration/thickSetup.ts`, `src/test/integration/**`, `src/oracleRunner.ts`, `src/oraclePoll.ts`, `scripts/db-matrix/run.sh`, `.github/workflows/integration.yml` |
| Esforço estimado | 1–2 dias |
| Complexidade | Média-Alta |
| Relaciona-se a | PRD-125 (eixo thick-full), PRD-101 (pool), PRD-120 (ativação preguiçosa), PRD-148 (confiabilidade de execução), issue #288 |

## 1. Resumo

O eixo `--thick-full` da PRD-125 voltou a rodar **thin** depois que a PRD-120
tornou a validação de setup preguiçosa: os testes que abrem conexão raw antes de
`ensurePool` inicializam o driver em thin e o `initOracleClient` posterior falha
com `NJS-118`. O preload `thickSetup` (commit `1e214e0`) devolve a inicialização
thick real e um probe de 21 testes passa, mas a suíte completa ainda entra em
cascata após os testes de timeout/cancelamento: o pool compartilhado fica
inutilizável para os testes seguintes. Esta PRD fecha o eixo thick-full de
verdade: garante inicialização thick determinística, corrige a recuperação do
pool após `break()` e valida a suíte completa no 23free (e o 11g com skips ou
limitação documentada).

## 2. Contexto e problema

### 2.1 Falso-verde thin no eixo thick-full

- `.vscode-test.thick-full.mjs` configura `utplsql.oracleClientMode: thick`, mas
  a inicialização do driver só acontece na primeira chamada de `ensurePool`
  (ativação é preguiçosa desde a PRD-120).
- Vários testes de integração (`compilationDiagnosticsE2E`, `dbPaths`,
  `debuggerE2E`, `runTimeoutE2E`, entre outros) abrem conexão raw
  (`oracledb.getConnection`) no `before` antes de qualquer `ensurePool`.
- A primeira conexão raw fixa o processo em **thin**; o `initOracleClient`
  posterior lança `NJS-118` (“Thick mode cannot be enabled because a Thin mode
  connection has already been created”), o runner cai no pool thin e a suíte
  “passa” sem exercitar thick.
- Evidência local (2026-11-07): o `--thick-full` sem preload terminou com
  `NJS-118` no log e 81/13 “passing”; com o preload, o mesmo host inicia
  `oracledb.thin === false`.

### 2.2 Cascata após timeout/cancelamento em thick real

Com o preload (`src/test/integration/thickSetup.ts` + `mocha.require`):

- Probe isolado de 21 testes (capacidades, timeout, cancelamento, tags,
  v0.13) passa **21/21** em thick.
- Na suíte completa, o teste de timeout e o de cancelamento
  (`schemaRun`) falham; a partir daí tags, scripts, cobertura e perfis falham em
  cascata. O pool compartilhado parece ficar envenenado depois do `break()`
  (`conn1.break()`/`conn2.break()`) em thick.
- O eixo thin continua verde no mesmo cenário (timeout/cancelamento não deixam
  resíduo), então a diferença é específica do thick — comportamento do driver
  ao quebrar conexões do pool, não uma limitação do utPLSQL.
- A issue **#288** já rastreia a instabilidade do host longo
  (`NJS-500`/`ORA-12547`) no thick-full; esta PRD incorpora o diagnóstico novo
  (timeout/cancelamento como gatilho determinístico da cascata).

### 2.3 Estado atual da matriz

- Thin full local (2026-11-07): 23free/18xe/12.2/19ee/21xe com
  **125 passing / 17 pending / 0 failing** cada (inclui multi-root).
- 11g thick-only: **4 passing** no eixo thick smoke.
- Thick-full 23free (2026-11-08, após a correção): **80 passing / 13 pending /
  0 failing** em ~2 min, com guarda de thick real e sem `continue-on-error`.
- Thick-full 11g (2026-11-08): **72 passing / 17 pending / 0 failing** com os
  skips legacy documentados (timeout/cancel, schema-node run, randomOrder/bind
  BOOLEAN e qualificação do stack); o eixo thick smoke continua verde.

## 3. Objetivos / Não-objetivos

**Objetivos**

- Garantir que o eixo `--thick-full` **falhe explicitamente** se o processo não
  estiver em thick (`oracledb.thin === false`).
- Reproduzir e corrigir a recuperação do pool compartilhado após
  timeout/cancelamento em thick, eliminando a cascata.
- Fechar a suíte completa thick no 23free com 0 falhas (respeitando os skips
  documentados) e registrar tempo/evidência no resumo da matriz.
- Definir a lista de skips do 11g/utPLSQL 3.1 ou manter o thick smoke como
  limitação documentada.
- Manter o eixo thin e a matriz 12.2–23ai sem regressão.

**Não-objetivos**

- Tornar o thick-full obrigatório no PR comum; ele continua
  dispatch/nightly até estabilizar.
- Rodar multi-root em thick (extensão futura).
- Adicionar 26ai/12.1 à matriz.
- Resolver toda a instabilidade de debugger thick da issue #288 além do que
  bloquear a suíte completa; falhas isoladas de debugger podem permanecer
  documentadas.
- Refatorar a arquitetura de pool/PRD-101 ou o event bus/PRD-128.

## 4. Requisitos

### RF1 — Inicialização thick determinística (feito no `1e214e0`)

- Manter `src/test/integration/thickSetup.ts` carregado por
  `mocha.require` no `.vscode-test.thick-full.mjs`.
- O preload só inicializa quando `UTPLSQL_THICK_TEST=1` e
  `ORACLE_CLIENT_LIB_DIR` está definido; erro de init que não seja
  “já inicializado” deve derrubar o host (não silenciar).
- Exportar um marcador (`UTPLSQL_THICK_ACTIVE=1` ou equivalente) e adicionar um
  teste de guarda no eixo thick-full que falha se o driver estiver thin.
- O eixo `--thick-full` não pode reutilizar o `.vscode-test.thick.mjs` (host
  isolado, sem `UTPLSQL_CONN`); são configurações distintas.

### RF2 — Recuperação do pool após timeout/cancelamento em thick

- Reproduzir deterministicamente: `runTimeoutE2E` → `schemaRun` (cancelamento) →
  `tagsStreaming` no mesmo host thick.
- Instrumentar `ensurePool`, `closeOraclePool`, `beginOracleActivity`,
  `cancelRun`/`break()` e `pool.status`/`connectionsInUse` para identificar se:
  - as conexões quebradas voltam ao pool em estado inválido;
  - `closeOraclePool` não fecha o pool após o `break` (promessa pendente,
    `poolCreation`, `currentPool` obsoleto);
  - o `pollOutputStream` fica preso em uma conexão morta.
- Corrigir no produto quando o defeito for real (ex.: invalidar/recriar o pool
  após `RunAbortedError` em thick, fechar conexões quebradas, limpar
  `currentPool`), com fallback seguro para thin.
- Teste de regressão: após um run abortado por timeout e outro por cancelamento,
  um run seguinte no mesmo host/pool termina com `passed >= 1` em thick.

### RF3 — Suíte completa thick no 23free

- Rodar `scripts/db-matrix/run.sh --only 23free --thick-full` com Instant Client
  23.0 e registrar:
  - contagem `passing/pending/failing`, tempo total e lista de skips;
  - confirmação de que o host iniciou thick (guarda do RF1).
- Meta: 0 falhas fora dos skips explícitos, tempo ≤ ~2× o thin full no mesmo
  banco (≈10 min), conforme RNF1 da PRD-125.
- Se alguma falha for de debugger/standalone (limitação conhecida), mover para
  skip condicional documentado — não mascarar com `continue-on-error`.

### RF4 — 11g / utPLSQL 3.1

- Tentar o full thick no 11g com timebox de 1 dia.
- Para cada falha, decidir: correção, skip condicional (`UTPLSQL_LEGACY=1` ou
  detecção de versão) ou limitação documentada.
- Se a suíte for estruturalmente incompatível, manter o thick smoke (4 testes)
  e registrar a limitação — sem prometer full no 11g.

### RF5 — CI e anti-falso-verde

- O dispatch `thick-full` (e o nightly, se aplicável) deve falhar se o host não
  estiver thick; hoje ele pode passar thin por `NJS-118`.
- Manter `continue-on-error` apenas enquanto experimental; remover quando RF2/RF3
  estiverem verdes.
- Não instalar Instant Client no PR comum nesta PRD; o eixo continua
  dispatch/nightly.

### RF6 — Docs, CHANGELOG e regra

- `wiki/Tests.md`: eixo thick-full, guarda de thick real e skips.
- `wiki/Contributing.md`: comandos e política de CI.
- `functional/10-development-tooling.md`: matriz e eixo thick-full.
- `CHANGELOG.md`: 0.20.1.
- Atualizar `BR-TEST-001` (matriz inclui a guarda de thick real) com
  `prds: ["PRD-125", "PRD-150"]`; se a correção de pool virar invariante de
  conexão, criar/ajustar regra `BR-CONN-*` com `prds: ["PRD-150"]`.

**Não-funcionais**

- RNF1 — Full thick no 23free ≤ ~2× o full thin no mesmo banco (≈10 min),
  excluindo bootstrap.
- RNF2 — Sem dependência nova.
- RNF3 — Skips determinísticos e documentados; nada de “flaky skip”.
- RNF4 — Thin full continua 125 passing / 17 pending por banco (inclui
  multi-root).
- RNF5 — Um teste de timeout/cancelamento não pode envenenar os testes
  seguintes no mesmo host.

## 5. Solução proposta

1. Consolidar o preload (`thickSetup`) e a guarda `oracledb.thin === false` no
   eixo thick-full.
2. Reproduzir a cascata com um recorte mínimo (`runTimeoutE2E` + `schemaRun` +
   `tagsStreaming`) em host thick e coletar `pool.status`, `connectionsInUse` e
   erros de `break()`/`close`.
3. Corrigir a recuperação do pool no `oracleRunner` (invalidação/recriação após
   abort em thick, fechamento de conexões quebradas e limpeza de
   `currentPool`/`poolCreation`), preservando o comportamento thin.
4. Rodar o full thick no 23free; triar cada falha restante (correção vs skip
   documentado).
5. Timebox do 11g; manter smoke se o full não fechar.
6. Atualizar docs/CHANGELOG/BR-TEST-001 e o resumo da matriz.

## 6. Configuração

Nenhuma setting/comando novo de runtime. Apenas env de teste
(`UTPLSQL_THICK_TEST`, `ORACLE_CLIENT_LIB_DIR`, `UTPLSQL_THICK_ACTIVE`) e
scripts de matriz/CI.

## 7. Plano de testes

- **Unitários**: `ensurePool`/`closeOraclePool` após abort; pool inválido em
  thick vs thin; `currentPool` limpo; guarda do preload (thin → falha).
- **Integração**: recorte timeout+cancelamento+tags em thick; full thick no
  23free; full thin no 23free como regressão; thick smoke no 11g.
- **CI**: dispatch `thick-full` com guarda anti-thin; matriz thin 18xe/21xe/23ai
  inalterada.
- **Manual**: `scripts/db-matrix/run.sh --only 23free --thick-full` e
  `--only 11xe --thick-full` com Instant Client 23.0.

## 8. Riscos e mitigação

| Risco | Mitigação |
|---|---|
| Correção do pool afetar o caminho thin | Testes de regressão thin (timeout/cancelamento/pool) e matriz completa |
| Thick é global e irreversível no host | Preload só no host isolado do thick-full; `.vscode-test.thick.mjs` continua separado |
| Cascata depender de ordem/estado | Recorte mínimo reproduzível + guarda de pool; nada de skip para “esconder” |
| Tempo do full thick no CI | Manter dispatch/nightly; RNF1 de ~10 min |
| 11g estruturalmente incompatível | Timebox de 1 dia; smoke documentado como limitação |
| Falso-verde voltar com mudanças futuras | Guarda `oracledb.thin === false` no eixo; CI falha se thin |

## 9. Rollout

- Patch lane **0.20.1** (junto da PRD-148), ou 0.21.0 se a correção de pool
  exigir mudança maior.
- `CHANGELOG.md` com a correção de recuperação do pool em thick e o eixo
  thick-full verdadeiro.
- O thick-full continua **experimental** no CI até RF2/RF3 verdes; depois,
  remover `continue-on-error` do dispatch.

## 10. Critérios de aceite

- `--thick-full` no 23free inicia thick (`oracledb.thin === false`) e falha
  explicitamente se não iniciar.
- Após timeout e cancelamento, um run seguinte no mesmo pool termina com
  `passed >= 1` em thick.
- Full thick 23free: 0 falhas fora dos skips documentados; tempo ≤ ~10 min.
- 11g: full com skips documentados **ou** limitação registrada + thick smoke
  verde.
- Thin full continua 125/17 por banco (23free, 18xe, 12.2, 19ee, 21xe).
- `brain:ci`, `docs:check`, `version:check` verdes; `BR-TEST-001` atualizada.
- Issue #288 referenciada e atualizada com o diagnóstico de timeout/cancelamento.

## 11. Questões em aberto

- A cascata é um bug do produto (pool após `break` em thick) ou do harness
  (estado compartilhado entre suítes)? A reprodução mínima do RF2 decide.
- Corrigir no `oracleRunner` ou isolar o pool por suíte no thick-full? Preferir
  produto se afetar usuários; isolar só se for artefato de teste.
- O 11g full entra no CI ou fica só local/smoke?
- O `thick-full` deixa de ser `continue-on-error` na 0.20.1 ou só na 0.21.0?

## 12. Impacto no cérebro

Regras criadas/ajustadas com `prds: ["PRD-150"]`:

- `BR-TEST-001` — eixo thick-full com guarda `oracledb.thin === false`, skips
  documentados e dispatch experimental.
- `BR-CONN-024` — abort descarta conexões quebradas e o pool; o próximo
  `ensurePool` cria uma instância limpa.

RNFs sem regra: RNF1, RNF2, RNF3, RNF4, RNF5 (tempo, sem dependência nova,
determinismo dos skips, regressão thin e isolamento de estado — verificadas
pela matriz/CI).

## Impacto nas docs

- `CHANGELOG`: correção da 0.20.1 e eixo thick-full verdadeiro.
- `wiki/Tests.md`: preload/guarda de thick, skips e como rodar o full thick.
- `wiki/Contributing.md`: comandos `--thick-full` e política de CI.
- `functional/10-development-tooling.md`: matriz local e eixo thick-full.
- Cada superfície cita `PRD-150` ou `<!-- prd:PRD-150 -->`.
