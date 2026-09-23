---
tipo: decisao
id: ADR-005
aliases: [ADR-005]
status: aceita
modulo: resultados
data: 2026-09-23
tags: [adr, resultados, junit, matching]
---

# ADR-005 - Funções canônicas de resultado e matching por nome

## Contexto

`runner.ts` e `oracleRunner.ts` evoluíram em paralelo e passaram a duplicar o
mapeamento resultado→`TestItem`, o parse de JUnit e o cálculo de cobertura. O
mapeamento precisa casar o XML do utPLSQL (classname/name) com a árvore do Test
Explorer, que pode ter itens por package, suite ou teste.

## Decisão

1. **Extrair funções canônicas** para `src/results.ts`:
   `applyResultsFromCases`, `applyCoverageFromXml`, `countResults`,
   `resolveStackFrameToUri`.
2. **Matching por `lastSegment(classname)` + `name`/`description`**, com fallback
   por nome (`findByNameOnly`) e índice `Map<"pkg|proc" | "pkg|desc", TestItem>`.
3. **Matching puro e testável** em `src/matching.ts` (PRD-44).

## Alternativas consideradas

- **Manter dois caminhos:** duplicação e drift de comportamento entre modos.
- **Casar por posição/ordem:** frágil; o XML não garante ordem estável.
- **Casar por nome completo do package:** quebra quando o classname traz prefixos
  (`UT3$`/schema) ou `%displayname`.

## Consequências

- **Positivas:** um único comportamento para os dois runners; funções puras
  testáveis com `node --test`; `message.location` populado habilita "Go to Error".
- **Negativas / trade-offs:** heurística de fallback por nome pode colidir em
  nomes repetidos; precisa cobrir variações de classname (quoted/unquoted).

## Referências

- PRDs: [[prd-39-deduplicate-runners|PRD-39]] ·
  [[prd-44-pure-matching|PRD-44]]
- Código: `src/results.ts`, `src/matching.ts`, `src/junit.ts`
- [[PAT-003 - Funções canônicas compartilhadas de resultado]]
