---
tipo: prd
id: PRD-131
aliases: [PRD-131]
status: completed
titulo: "Resiliência na descoberta: retry, cache e limpeza de Memento"
versao: "0.21.0"
data: "2026-10-30"
autor: "Gil Cleber Barboza"
versao_titulo: "0.21.0 — Arquitetura, configuração e resiliência"
verificado: "2026-10-30"
regras: ["BR-DISC-002", "BR-STATE-003"]
docs: ["CHANGELOG", "wiki/Architecture.md"]
tags: [prd]
---

# PRD-131 — Resiliência na descoberta: retry, cache e limpeza de Memento

| Campo | Valor |
|---|---|
| Autor | Gil Cleber Barboza |
| Data | 2026-10-30 |
| Componente | Extensão `paneb.vscode-utplsql` |
| Versão alvo | 0.21.0 |
| Arquivos afetados | `src/discovery.ts`, `src/testTree.ts`, `src/state.ts`, `src/oracleRunner.ts` |
| Esforço estimado | 1–2 dias |
| Complexidade | Média |
| Relaciona-se a | PRD-56 (duration persistence), PRD-103 (incremental source reindex) |

## 1. Resumo

Adicionar **retry com backoff exponencial** em operações de descoberta read-only
(`discoverDbSuites`, `discoverSchemasFromFolders`), **cache de metadados DB** com
TTL curto e **limpeza/limite de tamanho** no `workspaceState` (`lastResults`/
`lastFailedItems`).

## 2. Contexto e problema

- Descoberta DB depende de rede/Oracle; falha transitória aborta toda a descoberta
  sem retry.
- `ut_runner.get_suites_info` e `get_reporters_list` são chamados repetidamente em
  refreshes; sem cache, round-trips desnecessários.
- `state.persist()` guarda `lastResults`/`lastFailedItems` sem limite; em
  workspaces grandes pode crescer.

## 3. Objetivos / Não-objetivos

**Objetivos**
- Retry configurável (2–3 tentativas, backoff 200/400/800ms) apenas em erros
  transitórios; não retry em autenticação/permissão.
- Cache em memória (`Map` com TTL) para `get_suites_info` e `listReportersOracle`,
  invalidado em `clearDbSourceCache()`/refresh.
- Limite de tamanho/idade no Memento (ex.: manter apenas últimos N resultados ou
  descartar após 7 dias), migração transparente.

**Não-objetivos**
- Cache persistente em disco.
- Retry em operações de escrita (run/coverage).
- Mudar formato do Memento.

## 4. Requisitos

### RF1 — Retry
- `retryWithBackoff(fn, { attempts, isRetryable })` em `src/retry.ts` (puro);
  usado em `discoverDbSuites` e `discoverSchemasFromFolders`.

### RF2 — Identificação de erros transitórios
- `isRetryable(err)` identifica erros transitórios (timeout, conexão, rede) e
  exclui erros de autenticação/permissão.

### RF3 — Cache de metadados
- Cache em memória com TTL (30s) para `get_suites_info` e `listReportersOracle`,
  invalidado em `clearDbSourceCache()`/refresh; métricas hit/miss no log (debug).

### RF4 — Limpeza de Memento
- `state.persist()` aplica limite (`maxEntries`/`maxAgeDays`) e remove entradas
  antigas; migração transparente de snapshots antigos.

### RF5 — Testes
- Retry (sucesso na 2ª tentativa, desistência após N, não-retryable).
- Cache (hit/miss/expiração).
- Poda do Memento.

### RF6 — Discovery DB sem N+1

- Trocar uma query `ALL_SOURCE` por package por uma consulta agrupada (ou
  concorrência limitada 8–16) com timeout global; medir com o harness real
  antes/depois.
- Manter o fallback e a ordem determinística dos schemas/suites.

### RF7 — Folder correto em multi-root

- `discoverDbSuitesCore` não pode atribuir todas as suites de DB a
  `folders[0]`; resolver o folder por schema/pattern e usar a URI virtual
  correta.
- `resolveFolder` compara caminho com separador de diretório, não prefixo
  simples (`/ws/a` não pode casar `/ws/ab/...`).

### RF8 — Cache de metadados por run/pool

- Memoizar `get_reporters_list`/`discoverUtplsqlSchema` por pool key/run,
  invalidando em troca de conexão/refresh.
- Reduzir as consultas repetidas de cobertura/html/extras.

### RF9 — `collectAllItems` no schema mode

- `runFile`/`runRelated`/`runFolder`/`runByTag` não devem resolver todos os
  schemas antes de filtrar; usar os índices já descobertos ou cachear as
  suites por schema.

**Não duplicar:** `mergeSuiteLists` (união arquivo+banco) é tratado na
PRD-148.

**Não-funcionais**
- RNF1 — Sem regressão de latência no caminho feliz.
- RNF2 — Cobertura ≥ thresholds.

## 5. Solução proposta

- Criar `src/retry.ts`.
- Adicionar cache em `discovery.ts`/`oracleRunner.ts`.
- Ajustar `state.persist()`/`restore()` com poda.
- Invalidar cache no refresh.

## 6. Configuração

- `utplsql.discovery.retryAttempts` (number, default 2, min 0, max 5)
- `utplsql.discovery.cacheTtlSeconds` (number, default 30)

## 7. Plano de testes

- **Unitários**: retry, cache, poda do Memento.
- **Integração**: refresh com Oracle instável; cache hit em refresh consecutivo.
- **Manual**: simular falha de rede e verificar retry nos logs.

## 8. Riscos e mitigação

| Risco | Mitigação |
|---|---|
| Retry mascarar erro real | `isRetryable` restrito a erros transitórios; logar cada tentativa |
| Cache stale após DDL | TTL curto (30s) + invalidação em refresh manual |
| Poda quebrar restore | Migração transparente; testes de snapshot antigo |

## 9. Rollout

- **0.21.0** ("Arquitetura, configuração e resiliência"); sem mudança visível.
- Registrar no `CHANGELOG.md`.

## 10. Critérios de aceite

- Retry em descoberta (testes).
- Cache com TTL funcional.
- Memento podado com migração transparente.
- Cobertura ≥ thresholds; suíte verde.

## 11. Questões em aberto

- Retry opt-in via setting ou sempre ativo com `attempts=0` desativando?
- TTL de cache configurável ou fixo em 30s?

## 12. Impacto no cérebro

Regras criadas: `BR-DISC-002` ("descoberta Oracle tem retry transitório, cache
TTL e folder por schema") e `BR-STATE-003` ("snapshot do último run é podado por
idade e tamanho"), com `prds: ["PRD-131"]`, `implementacao:` e `testes:`.

## Impacto nas docs

`CHANGELOG` e `wiki/Architecture.md` descrevem retry/cache, folder multi-root e
a coleta filtrada por schema.

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - PRDs]]
- 📐 Regras: [[BR-DISC-002 - Descoberta Oracle tem retry transitório, cache TTL e folder por schema|BR-DISC-002]] · [[BR-STATE-003 - Snapshot do último run é podado por idade e tamanho|BR-STATE-003]]
- 🔗 PRDs relacionados: [[prd-56-duration-persistence|PRD-56]] · [[prd-103-incremental-source-reindex|PRD-103]] · [[prd-148-execution-state-reliability|PRD-148]]
- 🔗 Mesma versão (0.21.0): [[prd-128-event-bus-internal|PRD-128]] · [[prd-129-orchestration-strategy|PRD-129]] · [[prd-138-organization-strategy-pattern|PRD-138]] · [[prd-139-state-store-slicing-lru|PRD-139]]
- 🎯 RF1 — Retry → [[BR-DISC-002 - Descoberta Oracle tem retry transitório, cache TTL e folder por schema|BR-DISC-002]]
- 🎯 RF2 — Identificação de erros transitórios → [[BR-DISC-002 - Descoberta Oracle tem retry transitório, cache TTL e folder por schema|BR-DISC-002]]
- 🎯 RF3 — Cache de metadados → [[BR-DISC-002 - Descoberta Oracle tem retry transitório, cache TTL e folder por schema|BR-DISC-002]]
- 🎯 RF4 — Limpeza de Memento → [[BR-STATE-003 - Snapshot do último run é podado por idade e tamanho|BR-STATE-003]]
- 🎯 RF6 — Discovery DB sem N+1 → [[BR-DISC-002 - Descoberta Oracle tem retry transitório, cache TTL e folder por schema|BR-DISC-002]]
- 🎯 RF7 — Folder correto em multi-root → [[BR-DISC-002 - Descoberta Oracle tem retry transitório, cache TTL e folder por schema|BR-DISC-002]]
- 🎯 RF8 — Cache de metadados por run/pool → [[BR-DISC-002 - Descoberta Oracle tem retry transitório, cache TTL e folder por schema|BR-DISC-002]]
- 🎯 RF9 — `collectAllItems` no schema mode → [[BR-DISC-002 - Descoberta Oracle tem retry transitório, cache TTL e folder por schema|BR-DISC-002]]
- 🎯 RNF1 — Sem regressão de latência no caminho feliz. → [[BR-DISC-002 - Descoberta Oracle tem retry transitório, cache TTL e folder por schema|BR-DISC-002]]
- 🎯 RNF2 — Cobertura ≥ thresholds. → [[BR-DISC-002 - Descoberta Oracle tem retry transitório, cache TTL e folder por schema|BR-DISC-002]] · [[BR-STATE-003 - Snapshot do último run é podado por idade e tamanho|BR-STATE-003]]
- 🚀 ⬅️ release anterior: [[prd-150-thick-full-true-pool-recovery|PRD-150 (0.20.1)]] · ➡️ próxima release: [[prd-88-locale-aware-formatting|PRD-88 (0.22.0)]]
<!-- brain:auto:end -->
