---
id: BR-UI-006
aliases: [BR-UI-006]
tipo: regra
titulo: CodeLens usa glob canônico e languageIds sem duplicar
dominio: ui
status: ativo
severidade: alta
fonte: codigo
verificado: 2026-10-20
implementacao: ["src/extension.ts:117", "src/extension.ts:183", "src/codelens.ts:88", "package.json:881"]
testes: ["src/test/unit/codelens.test.ts", "src/test/integration/v017-features.test.ts"]
prds: ["PRD-24", "PRD-109"]
requisitos: ["PRD-24/RF1", "PRD-109/RF4"]
tags: ["ui", "codelens"]
---
## Enunciado

O CodeLens é registrado com um seletor que combina o glob canônico `**/*.pks`,
os globs efetivos de `utplsql.discovery.languageIds` (+ `files.associations`) e
os language IDs configurados. O provider é registrado **uma única vez**, então
um documento que casa com glob e language ID recebe um único conjunto de lenses.

## Pré-condições

Documento `scheme: file` cujo caminho/extensão/languageId pertence à identidade
PL/SQL (ver [[BR-PARSE-019 - Descoberta e CodeLens respeitam discovery.languageIds e files.associations|BR-PARSE-019]]).

## Exceções

- `.pks` continua recebendo CodeLens mesmo com `discovery.languageIds = []`.
- `.pkb` de produção também pode receber lenses se tiver `%suite`/`%test`
  parseáveis; o parser é o mesmo.
- URIs virtuais (`utplsql-db:`/`utplsql-source:`) não recebem CodeLens.
- O seletor é re-registrado quando `utplsql.discovery.languageIds` ou
  `files.associations` mudam; não há registro cumulativo.

## Justificativa

O registro apenas por `**/*.pks` deixava de fora `.tps`/`.pls` e associações
customizadas; registrar por language ID sem o glob `.pks` quebraria arquivos sem
associação de linguagem. A combinação cobre os dois casos sem duplicar lenses.

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - Regras]]
- 📄 PRDs: [[prd-24-codelens-integration|PRD-24]] · [[prd-109-language-identity|PRD-109]]
- 🎯 Requisitos: [[prd-24-codelens-integration|PRD-24 RF1]] · [[prd-109-language-identity|PRD-109 RF4]]
- 🧩 Código: [[COD - extension.ts]] · [[COD - codelens.ts]] · [[COD - package.json]]
- 🧪 Testes: [[TST - codelens.test.ts]] · [[TST - v017-features.test.ts]]
- ↩️ Referenciada por: [[05-ux-components]] · [[Editor-integration]] · [[prd-109-language-identity|PRD-109]] · [[prd-24-codelens-integration|PRD-24]]
<!-- brain:auto:end -->
