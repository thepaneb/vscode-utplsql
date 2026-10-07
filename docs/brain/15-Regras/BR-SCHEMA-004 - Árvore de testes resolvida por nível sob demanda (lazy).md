---
id: BR-SCHEMA-004
aliases: [BR-SCHEMA-004]
tipo: regra
titulo: Árvore de testes é resolvida por nível sob demanda (lazy)
dominio: schema
status: ativo
severidade: media
fonte: codigo
verificado: 2026-09-28
implementacao: ["src/testTree.ts:165", "src/testTree.ts:287", "src/testTree.ts:273", "src/extension.ts:55"]
testes: ["src/test/unit/testTree.test.ts", "src/test/integration/v014-features.test.ts"]
prds: ["PRD-75"]
requisitos: ["PRD-75/RF1", "PRD-75/RF4", "PRD-75/RNF1", "PRD-75/RNF2"]
tags: ["schema"]
---
## Enunciado

No modo `schema`, o refresh materializa apenas os nós de **schema**; `schema:` → `package:` → `suite:` → `test:` são resolvidos por nível no `resolveHandler` (`resolveSchemaNode`/`resolvePackageNode`/`resolveSuiteNode`) e cacheados em `resolvedNodes`. Rodar um nó não expandido resolve a subárvore antes (`resolveSubtree`); `collectAllItems` resolve a árvore inteira para os alvos do run.

## Pré-condições

`utplsql.organization = schema`.

## Exceções

Modo `file` continua materializado de uma vez; níveis não expandidos não consultam o banco.

## Justificativa

Reduzir o custo de abertura (tempo e memória) em schemas com muitos packages.

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - Regras]]
- 📄 PRDs: [[prd-75-lazy-test-tree|PRD-75]]
- 🎯 Requisitos: [[prd-75-lazy-test-tree|PRD-75 RF1]] · [[prd-75-lazy-test-tree|PRD-75 RF4]] · [[prd-75-lazy-test-tree|PRD-75 RNF1]] · [[prd-75-lazy-test-tree|PRD-75 RNF2]]
- 🧩 Código: [[COD - testTree.ts]] · [[COD - extension.ts]]
- 🧪 Testes: [[TST - testTree.test.ts]] · [[TST - v014-features.test.ts]]
- ↩️ Referenciada por: [[Tree-organization]] · [[prd-55-tag-organization|PRD-55]] · [[prd-75-lazy-test-tree|PRD-75]]
<!-- brain:auto:end -->
