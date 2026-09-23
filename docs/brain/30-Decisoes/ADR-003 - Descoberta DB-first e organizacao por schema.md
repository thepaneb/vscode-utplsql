---
tipo: decisao
status: aceita
modulo: descoberta
data: 2026-09-23
tags: [adr, descoberta, schema, utplsql]
---

# ADR-003 - Descoberta de testes DB-first com merge por arquivo

## Contexto

As suites utPLSQL existem em dois lugares: nos arquivos `.pks` do workspace e no
próprio banco (packages compilados). Suites podem existir só no banco (sem arquivo
local) ou só no filesystem. A árvore precisa representar ambos sem duplicar e sem
depender de o banco estar acessível.

## Decisão

1. **Descoberta por arquivo** (`discoverWorkspace`) sempre roda: `findFiles` +
   `parseSuiteText` (regex `%suite`/`%test` + annotations).
2. **Descoberta pelo banco** (`discoverSchemaFromDb` → `discoverSchemaFromConn`) é
   complementar, via `ut_runner.get_suites_info` (DB-first, PRD-74) com fallback
   para `ALL_OBJECTS`/`ALL_SOURCE` (PRD-43).
3. **Merge com prioridade do filesystem**: suites/arquivos locais vencem o banco;
   suites só-DB entram depois.
4. **Modo schema** organiza a árvore em `Schema > Package > Suite > Test`
   (`cfg.organization = schema`), com `state.suiteMap` para lookup.

## Alternativas consideradas

- **Só filesystem:** simples, mas esconde suites compiladas sem arquivo (ex.:
  instaladas pelo DBA) e quebra o modo schema.
- **Só banco:** exige conexão para montar a árvore; workspace sem conexão ficaria
  vazio.
- **`ALL_SOURCE` sempre:** não expõe anotações/`%disabled` de forma confiável e é
  mais lento que `get_suites_info`.

## Consequências

- **Positivas:** árvore completa com ou sem conexão; suites do banco visíveis;
  `get_suites_info` é a fonte mais fiel das anotações.
- **Negativas / trade-offs:** duas fontes → regras de merge; o cache de anotações
  do utPLSQL pode ficar defasado (mitigado pelo comando **Rebuild Annotation
  Cache**, PRD-77); no modo schema as suites ficam aninhadas 3 níveis (usar
  `state.getSuiteItem()`).

## Referências

- PRDs: [43](../../prd/completed/prd-43-schema-db-discovery.md) ·
  [74](../../prd/completed/prd-74-db-first-discovery.md) ·
  [77](../../prd/completed/prd-77-rebuild-annotation-cache.md) ·
  [30](../../prd/completed/prd-30-schema-aware-organization.md)
- Código: `src/discovery.ts`, `src/suiteParser.ts`, `src/testTree.ts`
- [[MOC - Oracle]] · [[PAT-004 - Streaming por poll incremental de buffer]]
