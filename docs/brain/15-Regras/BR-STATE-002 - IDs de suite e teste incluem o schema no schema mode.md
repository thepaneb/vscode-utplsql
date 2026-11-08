---
id: BR-STATE-002
aliases: [BR-STATE-002]
tipo: regra
titulo: IDs de suite e teste incluem o schema no schema mode
dominio: estado
status: ativo
severidade: alta
fonte: codigo
verificado: 2026-11-08
implementacao: ["src/testTree.ts", "src/types.ts", "src/state.ts"]
testes: ["src/test/unit/testTree.test.ts", "src/test/unit/state.test.ts"]
prds: ["PRD-148"]
requisitos: ["PRD-148/RF7"]
interno: true
tags: ["estado", "schema"]
---
## Enunciado

No modo `schema`, suites e testes usam `suite:<schema>:<pkg>` e
`test:<schema>:<pkg>.<proc>` (com o sufixo de tag quando aplicável). O mesmo
package em dois owners gera ids distintos. As árvores `file`/`tag` mantêm os ids
legados (`suite:<pkg>`, `test:<pkg>.<proc>`), e o lookup legado `suite:<pkg>`
continua apontando para a primeira ocorrência no schema mode.

## Pré-condições

`utplsql.organization = "schema"` e o nó `package:<schema>:<pkg>` resolvido.

## Exceções

`ItemMeta.schema` é opcional; suites de banco sem owner conhecido usam
`UNKNOWN` apenas para o nó de schema, não para o id.

## Justificativa

Sem o schema no id, dois owners com o mesmo package colidiam no `TestController`
e apenas uma cópia sobrevivia (dedupe silencioso).

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - Regras]]
- 📄 PRDs: [[prd-148-execution-state-reliability|PRD-148]]
- 🎯 Requisitos: [[prd-148-execution-state-reliability|PRD-148 RF7]]
- 🧩 Código: [[COD - testTree.ts]] · [[COD - types.ts]] · [[COD - state.ts]]
- 🧪 Testes: [[TST - testTree.test.ts]] · [[TST - state.test.ts]]
- ↩️ Referenciada por: [[Architecture]] · [[prd-148-execution-state-reliability|PRD-148]]
<!-- brain:auto:end -->
