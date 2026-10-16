---
id: BR-QUAL-003
aliases: [BR-QUAL-003]
tipo: regra
titulo: Último resultado é persistido e restaurado com snapshot versionado
dominio: qualidade
status: ativo
severidade: baixa
fonte: codigo
verificado: 2026-10-14
implementacao: ["src/state.ts", "src/oracleRunner.ts", "src/results.ts", "src/extension.ts", "src/testTree.ts"]
testes: ["src/test/unit/state.test.ts"]
prds: ["PRD-56"]
requisitos: ["PRD-56/RF1", "PRD-56/RF2", "PRD-56/RF3", "PRD-56/RF4", "PRD-56/RNF1", "PRD-56/RNF2"]
tags: ["qualidade", "estado"]
---

# BR-QUAL-003 — Último resultado é persistido e restaurado com snapshot versionado

## Enunciado

Ao fim de cada execução a extensão grava no `workspaceState` (chave
`utplsql.lastRunSnapshot`) um snapshot **versionado** (`v: 1`) com
`id → {status, message, durationMs, ts}` — mensagens truncadas em
`PERSIST_MESSAGE_LIMIT` e sem cobertura. Na ativação o snapshot é restaurado
**antes** do primeiro refresh, e `lastFailedItems` é reconstruído depois dele
mapeando ids → itens da árvore (`restoreLastFailed`), religando o context key
`utplsql:hasFailures` e as decorações. Snapshot com formato desconhecido, ou
entrada inválida, é **descartado em silêncio** — nunca quebra a ativação. A
duração por teste só entra no label com `utplsql.showTestDuration` ligado
(`(1.2s)`), substituindo um sufixo anterior em vez de acumular.

## Pré-condições

`context.workspaceState` disponível; a reconstrução de `lastFailedItems` exige a
árvore já montada (ids → itens).

## Exceções

Suite/teste removido do workspace: o id fica sem item correspondente e é ignorado
na reconstrução (o resultado continua no snapshot até o próximo run). O
"Rerun Last" segue apenas de sessão (`lastRun` não é persistido).

## Justificativa

Sem persistência, recarregar o workspace apagava as decorações e o conjunto de
falhas, obrigando a reexecutar tudo só para ver o que havia falhado. O `v` e o
teto de mensagem existem para que um upgrade de formato ou uma falha gigante não
inflatam/quebrem o estado do workspace; o `workspaceState` (em vez de
`globalState`) garante que um snapshot de outro projeto nunca apareça.

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - Regras]]
- 📄 PRDs: [[prd-56-duration-persistence|PRD-56]]
- 🎯 Requisitos: [[prd-56-duration-persistence|PRD-56 RF1]] · [[prd-56-duration-persistence|PRD-56 RF2]] · [[prd-56-duration-persistence|PRD-56 RF3]] · [[prd-56-duration-persistence|PRD-56 RF4]] · [[prd-56-duration-persistence|PRD-56 RNF1]] · [[prd-56-duration-persistence|PRD-56 RNF2]]
- 🧩 Código: [[COD - state.ts]] · [[COD - oracleRunner.ts]] · [[COD - results.ts]] · [[COD - extension.ts]] · [[COD - testTree.ts]]
- 🧪 Testes: [[TST - state.test.ts]]
- ↩️ Referenciada por: [[Test-explorer]] · [[prd-56-duration-persistence|PRD-56]]
<!-- brain:auto:end -->
