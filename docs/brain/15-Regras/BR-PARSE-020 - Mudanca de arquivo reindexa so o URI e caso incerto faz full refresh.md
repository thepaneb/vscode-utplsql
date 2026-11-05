---
id: BR-PARSE-020
aliases: [BR-PARSE-020]
tipo: regra
titulo: Mudança de arquivo reindexa só o URI; caso incerto faz full refresh
dominio: parsing
status: ativo
severidade: media
interno: true
fonte: codigo
verificado: 2026-11-05
implementacao: ["src/debounce.ts", "src/discovery.ts", "src/testTree.ts", "src/extension.ts"]
testes: ["src/test/unit/debounce.test.ts", "src/test/unit/testTree.test.ts"]
prds: ["PRD-103"]
requisitos: ["PRD-103/RNF1", "PRD-103/RNF2"]
tags: [parsing, watcher]
---

## Enunciado

O watcher coalesce eventos **por URI** e, no modo `file`, reindexa apenas o
arquivo alterado (`discoverUri` + atualização do item da árvore). Arquivo
removido sai do índice/árvore e o jump-to-failure cai na fonte virtual. Modos
`tag`/`schema`, rajadas grandes e qualquer caso incerto usam o **full refresh**
seguro.

## Pré-condições

`createPerKeyDebouncer` puro; `refreshUri`/`removeUri` no refresher; resultados
dos arquivos não afetados permanecem na árvore.

## Exceções

Eventos sem URI (harnesses antigos) e mudanças de configuração continuam
disparando refresh completo.

## Justificativa

Evita varrer o workspace inteiro a cada gravação em workspaces grandes, sem
trocar corretude por incremento: o full refresh continua sendo o fallback.
