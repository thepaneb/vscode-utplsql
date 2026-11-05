---
tipo: nota
status: ativo
titulo: "Análise de cobertura — 0.20.0"
verificado: 2026-11-05
tags: [teste, cobertura, 0.20.0]
---

# Análise de cobertura — 0.20.0

Registro do gate pós-PRD: para cada PRD da 0.20.0, o que foi coberto em
**unitários**, **integração** e **matriz**, e quais lacunas viraram teste,
issue ou “não aplicável”. O baseline final foi **98,22% lines / 94,02%
branches / 98,5% functions** (c8), com 1.658 testes passando.

## PRD-120 — Ativação enxuta

- Unitários: manifesto, ativação sem validação, primeira interação, memoização
  e invalidação (`extensionActivation.test.ts`, `manifestDebugger.test.ts`).
- Integração: `dbPaths.test.ts` e ativação do host preservam árvore/diagnóstico.
- Matriz: 23free smoke; sem comportamento específico de banco.
- Lacuna: “workspace sem PL/SQL não ativa” é verificado pelo manifesto, não pelo
  harness (que sempre ativa a extensão). Sem issue.

## PRD-107 — Fixture sem privilégios

- Unitários: fallback `ALL_SOURCE` (já existente em `discovery.test.ts`).
- Integração: `prd107Unpriv.test.ts` (DDL negado, `V$SQL`, discovery, observador)
  e `viewCoverageDenied.test.ts` com o usuário restrito.
- Matriz: 23free; o mesmo helper serve ao 11g thick quando provisionado.
- Lacuna: grants reais no 11g dependem do bootstrap da matriz; coberto pelo
  próprio `setup.sh`.

## PRD-101 — Pool ocioso

- Unitários: `oraclePoolActivity.test.ts` (ref-count, `end` duplicado,
  `connectionsInUse`, setting off, remoção do cache, falha no close).
- Integração: `prd101PoolClose.test.ts` valida a sessão em `v$session`; o
  thick-full desliga o setting para preservar os testes de timeout.
- Matriz: 23free thin; 11g thick no eixo de matriz.
- Lacuna: concorrência real de dois runs é coberta pelo ref-count unitário; um
  E2E concorrente fica como melhoria futura (não bloqueia).

## PRD-111 RF2 — Options agrupadas

- Unitários: toda a suíte de `executeRunOracle`/`runner`, incluindo o formato
  agrupado e os aliases flat.
- Integração: regressão thin/thick.
- Matriz: sem mudança de comportamento.
- Lacuna: migrar os testes restantes para o formato agrupado e remover aliases
  numa limpeza futura.

## PRD-102 — Trace/perf

- Unitários: `perf.test.ts` e `logger.test.ts` (fases, JSONL, sink com falha,
  gate de trace).
- Integração: o harness da PRD-106 mede as cinco fases e grava JSONL.
- Matriz: 23free; probe agnóstico de versão.
- Lacuna: nenhuma.

## PRD-103 — Reindex incremental

- Unitários: `debounce.test.ts` (per-key/cancel) e `testTree.test.ts`
  (`refreshUri`, `removeUri`, preservação da suíte não afetada, fallback
  tag, concorrência com full refresh).
- Integração: wiring do watcher em `extensionActivation.test.ts`.
- Matriz: 23free smoke; sem eixo de banco específico.
- Lacuna: incremental restrito ao modo `file` por design; `tag`/`schema` usam
  full refresh.

## PRD-106 — Harness de perf

- Unitários: `perfFixture.test.ts` (seed, contagem, modos, prefixo, CLI).
- Integração/perf: `perfHarness.test.ts` mede discovery, buildTree, run, poll e
  parseXml e grava `test-results/perf-report.jsonl`.
- Matriz: 23free no workflow semanal; 18c/21c podem reutilizar o script.
- Lacuna: fixture de 1000 packages fica sob demanda/semanal; 11g documentado
  fora do harness completo.

## PRD-125 — Thick-full

- Unitários: `matrixConfig.test.ts` e guardas do `run.sh`.
- Integração: thick-full 23free **81 passing / 13 pending / 0 failing**; thick
  smoke 11g verde (4 passing).
- Matriz: 18c/21c full semanal; 19ee smoke; 23free nightly; 11g full limitado
  documentado.
- Lacuna: suíte completa no 11g segue como dispatch experimental (decisão de
  Rollout da PRD).

## PRD-147 — Marketplace (em andamento)

- Unitários: `marketplaceImages.test.ts` (manifesto, PNG/dimensões, referências)
  e `packageTarget.test.ts` (`--readme-path`).
- Integração: `npm run package` + inspeção do VSIX; `docs:check`/`docs:fidelity`.
- Matriz: não aplicável; o workspace de captura usa o demo no 23free.
- Lacuna: captura manual das 4–5 screenshots (checklist no vault) antes do
  commit final; inspeção pós-publish.
