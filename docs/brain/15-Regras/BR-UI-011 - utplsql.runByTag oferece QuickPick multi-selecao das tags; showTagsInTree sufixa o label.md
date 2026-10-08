---
id: BR-UI-011
aliases: [BR-UI-011]
tipo: regra
titulo: utplsql.runByTag oferece QuickPick multi-seleção das tags; showTagsInTree sufixa o label
dominio: ui
status: ativo
severidade: media
fonte: codigo
verificado: 2026-10-02
implementacao: ["src/commands/run.ts:337", "src/testTree.ts:21", "src/testTree.ts:60"]
testes: ["src/test/unit/runByTagCommand.test.ts", "src/test/unit/runCommands.test.ts", "src/test/unit/testTree.test.ts", "src/test/integration/prd015ExtraE2E.test.ts"]
prds: ["PRD-51"]
requisitos: ["PRD-51/RF3", "PRD-51/RF4"]
tags: ["ui", "tags"]
---

# BR-UI-011 — utplsql.runByTag oferece QuickPick multi-seleção das tags; showTagsInTree sufixa o label

## Enunciado

`utplsql.runByTag` monta o QuickPick com a união distinta das tags de
`collectAllItems`, aceita `!` para exclusão, e sem alvo avisa (não executa); com
`utplsql.showTagsInTree` (default `false`) o label do `TestItem` ganha o sufixo
`[tag1, tag2]`.

## Pré-condições

Árvore populada com metas contendo tags; comando registrado no `package.json`.

## Exceções

Nenhuma tag disponível ⇒ aviso e retorno; sem seleção ⇒ comportamento inalterado.

## Justificativa

Expor na paleta/tooltip o que já existe no runner (`a_tags`), reaproveitando
`collectAllItems` e `runWithProgress`.

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - Regras]]
- 📄 PRDs: [[prd-51-run-by-tag|PRD-51]]
- 🎯 Requisitos: [[prd-51-run-by-tag|PRD-51 RF3]] · [[prd-51-run-by-tag|PRD-51 RF4]]
- 🧩 Código: [[COD - run.ts]] · [[COD - testTree.ts]]
- 🧪 Testes: [[TST - runByTagCommand.test.ts]] · [[TST - runCommands.test.ts]] · [[TST - testTree.test.ts]] · [[TST - prd015ExtraE2E.test.ts]]
- ↩️ Referenciada por: [[Commands]] · [[Editor-integration]] · [[prd-51-run-by-tag|PRD-51]]
<!-- brain:auto:end -->
