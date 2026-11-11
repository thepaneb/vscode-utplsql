---
id: BR-ARCH-003
aliases: [BR-ARCH-003]
tipo: regra
titulo: Organização da árvore de testes é selecionada por Strategy
dominio: arquitetura
status: ativo
severidade: media
interno: true
fonte: codigo
verificado: 2026-11-11
implementacao: ["src/organization/strategy.ts", "src/testTree.ts", "src/configReactivity.ts", "src/extension.ts"]
testes: ["src/test/unit/organizationStrategy.test.ts", "src/test/unit/configReactivity.test.ts", "src/test/unit/testTree.test.ts", "src/test/unit/extensionActivation.test.ts"]
prds: ["PRD-138"]
requisitos: ["PRD-138/RF1", "PRD-138/RF2", "PRD-138/RF3", "PRD-138/RF4", "PRD-138/RF5", "PRD-138/RNF1", "PRD-138/RNF2"]
tags: ["arquitetura", "arvore"]
---
## Enunciado

`createOrganizationStrategy(mode)` seleciona `FileOrganization`,
`SchemaOrganization` ou `TagOrganization`; `createRefresher` delega o
`build` para a strategy e `testTree.ts` permanece como fachada compatível. A
mudança de `organization`, `includePatterns`, `showTagsInTree`,
`showTestDuration` ou `discovery.source` atualiza a árvore; mudanças em
`discovery.languageIds`/`files.associations` recriam CodeLens **e** watcher.
Expansões concorrentes do mesmo nó `schema:` compartilham a mesma promise.

## Controle

`src/organization/strategy.ts` (interface + três implementações + factory),
`src/configReactivity.ts` (classificação das mudanças) e o mapa in-flight em
`resolveSchemaNode` (`src/testTree.ts`).

## Justificativa

Adicionar novos modos de organização sem tocar em vários pontos e evitar
consultas/duplicações quando o usuário expande o mesmo schema em paralelo.

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - Regras]]
- 📄 PRDs: [[prd-138-organization-strategy-pattern|PRD-138]]
- 🎯 Requisitos: [[prd-138-organization-strategy-pattern|PRD-138 RF1]] · [[prd-138-organization-strategy-pattern|PRD-138 RF2]] · [[prd-138-organization-strategy-pattern|PRD-138 RF3]] · [[prd-138-organization-strategy-pattern|PRD-138 RF4]] · [[prd-138-organization-strategy-pattern|PRD-138 RF5]] · [[prd-138-organization-strategy-pattern|PRD-138 RNF1]] · [[prd-138-organization-strategy-pattern|PRD-138 RNF2]]
- 🧩 Código: [[COD - strategy.ts]] · [[COD - testTree.ts]] · [[COD - configReactivity.ts]] · [[COD - extension.ts]]
- 🧪 Testes: [[TST - organizationStrategy.test.ts]] · [[TST - configReactivity.test.ts]] · [[TST - testTree.test.ts]] · [[TST - extensionActivation.test.ts]]
- ↩️ Referenciada por: [[Architecture]] · [[Tree-organization]] · [[prd-138-organization-strategy-pattern|PRD-138]]
<!-- brain:auto:end -->
