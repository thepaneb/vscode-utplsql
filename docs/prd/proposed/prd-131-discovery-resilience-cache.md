<!-- GENERATED FROM docs/brain/20-PRDs/prd-131-discovery-resilience-cache.md — DO NOT EDIT -->

# PRD-131 — Resiliência na descoberta: retry, cache e limpeza de Memento

| Campo | Valor |
|---|---|
| Status | Proposto |
| Autor | Gil Cleber Barboza |
| Data | 2026-10-30 |
| Componente | Extensão `paneb.vscode-utplsql` |
| Versão alvo | 0.20.0 |
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

- **0.20.0** ("Observabilidade e desempenho"); sem mudança visível.
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

Criar regra `BR-DISC-*` ("descoberta DB é resiliente a falhas transitórias e cacheada
com TTL") com `prds: ["PRD-131"]`, `implementacao:` e `testes:`. Enquanto
`proposed`, `regras: []`.

## Impacto nas docs

`CHANGELOG` e `wiki/Architecture.md`.
