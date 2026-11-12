---
id: BR-DISC-002
aliases: [BR-DISC-002]
tipo: regra
titulo: Descoberta Oracle tem retry transitório, cache TTL e folder por schema
dominio: descoberta
status: ativo
severidade: media
interno: true
fonte: codigo
verificado: 2026-11-11
implementacao: ["src/retry.ts", "src/metadataCache.ts", "src/discovery.ts", "src/oracleRunner.ts", "src/dbSourceProvider.ts", "src/testTree.ts"]
testes: ["src/test/unit/retry.test.ts", "src/test/unit/metadataCache.test.ts", "src/test/unit/discovery.test.ts", "src/test/unit/oracleRunner.test.ts", "src/test/unit/testTree.test.ts", "src/test/integration/v021-features.test.ts"]
prds: ["PRD-131"]
requisitos: ["PRD-131/RF1", "PRD-131/RF2", "PRD-131/RF3", "PRD-131/RF6", "PRD-131/RF7", "PRD-131/RF8", "PRD-131/RF9", "PRD-131/RNF1", "PRD-131/RNF2"]
tags: ["descoberta", "cache", "resiliencia"]
---
## Enunciado

Falhas transitórias de conexão/rede na descoberta são repetidas com backoff
exponencial (tentativas extras configuráveis; autenticação/permissão nunca são
repetidas). Metadados Oracle (`get_suites_info`, `get_reporters_list` e o
prefixo do schema utPLSQL) usam cache em memória com TTL, invalidado por refresh,
troca de pool/conexão e `clearDbSourceCache()`. A descoberta multi-root resolve
o folder pelo `organization.schemaPattern` e usa contenção de caminho
(`/ws/a` não casa `/ws/ab`); `runFile`/`runRelated`/`runFolder` resolvem apenas
o schema relevante em vez de materializar toda a árvore.

## Controle

`src/retry.ts` (`retryWithBackoff`/`isRetryable`), `src/metadataCache.ts`
(`TtlCache`/`oracleMetadataCache`), `src/discovery.ts` (retry, cache de
`get_suites_info`, concorrência limitada no `ALL_SOURCE`, folder por schema) e
`src/testTree.ts` (`collectItemsForPath`).

## Justificativa

Reduzir o impacto de falhas transitórias e o custo de refreshes repetidos em
schemas grandes, sem mudar o resultado observável da descoberta.

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - Regras]]
- 📄 PRDs: [[prd-131-discovery-resilience-cache|PRD-131]]
- 🎯 Requisitos: [[prd-131-discovery-resilience-cache|PRD-131 RF1]] · [[prd-131-discovery-resilience-cache|PRD-131 RF2]] · [[prd-131-discovery-resilience-cache|PRD-131 RF3]] · [[prd-131-discovery-resilience-cache|PRD-131 RF6]] · [[prd-131-discovery-resilience-cache|PRD-131 RF7]] · [[prd-131-discovery-resilience-cache|PRD-131 RF8]] · [[prd-131-discovery-resilience-cache|PRD-131 RF9]] · [[prd-131-discovery-resilience-cache|PRD-131 RNF1]] · [[prd-131-discovery-resilience-cache|PRD-131 RNF2]]
- 🧩 Código: [[COD - retry.ts]] · [[COD - metadataCache.ts]] · [[COD - discovery.ts]] · [[COD - oracleRunner.ts]] · [[COD - dbSourceProvider.ts]] · [[COD - testTree.ts]]
- 🧪 Testes: [[TST - retry.test.ts]] · [[TST - metadataCache.test.ts]] · [[TST - discovery.test.ts]] · [[TST - oracleRunner.test.ts]] · [[TST - testTree.test.ts]] · [[TST - v021-features.test.ts]]
- ↩️ Referenciada por: [[Architecture]] · [[prd-131-discovery-resilience-cache|PRD-131]]
<!-- brain:auto:end -->
