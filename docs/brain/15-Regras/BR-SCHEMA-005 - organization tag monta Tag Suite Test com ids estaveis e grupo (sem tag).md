---
id: BR-SCHEMA-005
aliases: [BR-SCHEMA-005]
tipo: regra
titulo: organization=tag monta Tag > Suite > Test com ids estáveis e grupo (sem tag)
dominio: schema
status: ativo
severidade: media
fonte: codigo
verificado: 2026-10-02
implementacao: ["src/testTree.ts:117", "src/testTree.ts:171"]
testes: ["src/test/unit/testTree.test.ts"]
prds: ["PRD-55"]
requisitos: ["PRD-55/RF1", "PRD-55/RF2", "PRD-55/RF3", "PRD-55/RNF1", "PRD-55/RNF2"]
tags: ["schema", "tags"]
---

# BR-SCHEMA-005 — organization=tag monta Tag > Suite > Test com ids estáveis e grupo (sem tag)

## Enunciado

Com `utplsql.organization` = `tag`, `doRefresh` chama `buildTagTree`: as suites
são agrupadas por tag (sem tag ⇒ grupo "(sem tag)"); o id de suite/teste permanece
`suite:<pkg>`/`test:<pkg>.<proc>`, preservando `state.suiteMap` e o mapeamento
resultado→teste (BR-PARSE-013); suite com múltiplas tags aparece sob cada tag por
um id de tag próprio, sem reutilizar o mesmo id de suite.

## Pré-condições

Tags propagadas (BR-PARSE-016/017); modos `file`/`schema` inalterados.

## Exceções

`tag` sem workspace folders segue a árvore de arquivo (como `schema` hoje); o
grupo "(sem tag)" sempre existe quando houver suite sem tag.

## Justificativa

Dar visão por tag sem quebrar `suiteMap`, `collectAllItems` e o jump to failure.

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - Regras]]
- 📄 PRDs: [[prd-55-tag-organization|PRD-55]]
- 🎯 Requisitos: [[prd-55-tag-organization|PRD-55 RF1]] · [[prd-55-tag-organization|PRD-55 RF2]] · [[prd-55-tag-organization|PRD-55 RF3]] · [[prd-55-tag-organization|PRD-55 RNF1]] · [[prd-55-tag-organization|PRD-55 RNF2]]
- 🧩 Código: [[COD - testTree.ts]]
- 🧪 Testes: [[TST - testTree.test.ts]]
- ↩️ Referenciada por: [[Tree-organization]] · [[prd-55-tag-organization|PRD-55]]
<!-- brain:auto:end -->
