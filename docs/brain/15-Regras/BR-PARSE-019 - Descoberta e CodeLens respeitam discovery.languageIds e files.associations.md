---
id: BR-PARSE-019
aliases: [BR-PARSE-019]
tipo: regra
titulo: Descoberta e CodeLens respeitam discovery.languageIds e files.associations
dominio: descoberta
status: ativo
severidade: alta
fonte: codigo
verificado: 2026-10-20
implementacao: ["src/languageIdentity.ts:56", "src/languageIdentity.ts:91", "src/languageIdentity.ts:134", "src/testTree.ts:466", "src/codelens.ts:88", "src/extension.ts:117", "package.json:343", "package.json:881"]
testes: ["src/test/unit/languageIdentity.test.ts", "src/test/unit/codelens.test.ts", "src/test/unit/testTree.test.ts", "src/test/integration/v017-features.test.ts"]
prds: ["PRD-109"]
requisitos: ["PRD-109/RF1", "PRD-109/RF2", "PRD-109/RF3", "PRD-109/RF4", "PRD-109/RNF1", "PRD-109/RNF2"]
tags: ["descoberta"]
---
## Enunciado

A descoberta, o CodeLens e o watcher usam a identidade PL/SQL composta por
`utplsql.discovery.languageIds` (default `plsql`, `sql`, `oracle-sql`) e por
`files.associations`: os globs efetivos vêm das extensões/filenames contribuídos
pelas linguagens instaladas e das associações que apontam para um desses IDs.
O `.pks` canônico é sempre aceito, mesmo com a setting restrita.

## Pré-condições

`languageIds` não vazio ou arquivo `.pks`; `files.associations` lidas por folder
no multi-root.

## Exceções

- Arquivo fora da identidade não recebe CodeLens nem entra na descoberta.
- URIs virtuais (`utplsql-db:`/`utplsql-source:`) continuam sem CodeLens.
- Um documento que casa com glob **e** language ID recebe um único conjunto de
  lenses: o provider é registrado uma vez, não uma vez por seletor.
- `includePatterns` continua sendo somado como globs adicionais.

## Justificativa

Projetos usam `.pls`, `.plb`, `.tps`, `.tpb`, `.vw` e extensões próprias mapeadas
por `files.associations`; registrar apenas `**/*.pks` deixava esses arquivos sem
descoberta e CodeLens. Resolver as extensões em runtime evita uma lista fixa que
quebraria com extensões de terceiros.

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - Regras]]
- 📄 PRDs: [[prd-109-language-identity|PRD-109]]
- 🎯 Requisitos: [[prd-109-language-identity|PRD-109 RF1]] · [[prd-109-language-identity|PRD-109 RF2]] · [[prd-109-language-identity|PRD-109 RF3]] · [[prd-109-language-identity|PRD-109 RF4]] · [[prd-109-language-identity|PRD-109 RNF1]] · [[prd-109-language-identity|PRD-109 RNF2]]
- 🧩 Código: [[COD - languageIdentity.ts]] · [[COD - testTree.ts]] · [[COD - codelens.ts]] · [[COD - extension.ts]] · [[COD - package.json]]
- 🧪 Testes: [[TST - languageIdentity.test.ts]] · [[TST - codelens.test.ts]] · [[TST - testTree.test.ts]] · [[TST - v017-features.test.ts]]
- ↩️ Referenciada por: [[01-test-discovery]] · [[05-ux-components]] · [[Editor-integration]] · [[prd-109-language-identity|PRD-109]]
<!-- brain:auto:end -->
