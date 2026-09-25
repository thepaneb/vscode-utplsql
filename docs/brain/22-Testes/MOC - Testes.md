---
tipo: moc
status: ativo
verificado: 2026-09-24
tags: [moc, teste]
---

# MOC - Testes

Notas **geradas** (`TST-*`) — uma por arquivo de teste referenciado em
`testes:` nas camadas. Servem de **nós** do grafo para ligar as regras/NFRs/erros
aos testes que as validam. **Não edite** (regeneradas por `npm run brain:sync`).

## Arquivos de teste

```dataview
TABLE arquivo, file.mtime AS "Atualizado"
FROM "22-Testes"
WHERE tipo = "teste"
SORT id ASC
```

## Índice (links)

<!-- brain:auto:start:moc-index -->
- [[TST - codelens.test.ts]] — `TST-codelens.test.ts`
- [[TST - config.test.ts]] — `TST-config.test.ts`
- [[TST - connectionProfiles.test.ts]] — `TST-connectionProfiles.test.ts`
- [[TST - coverage.test.ts]] — `TST-coverage.test.ts`
- [[TST - dbPaths.test.ts]] — `TST-dbPaths.test.ts`
- [[TST - discovery.test.ts]] — `TST-discovery.test.ts`
- [[TST - extension.test.ts]] — `TST-extension.test.ts`
- [[TST - i18n.test.ts]] — `TST-i18n.test.ts`
- [[TST - jumpToFailureE2E.test.ts]] — `TST-jumpToFailureE2E.test.ts`
- [[TST - junit.test.ts]] — `TST-junit.test.ts`
- [[TST - logger.test.ts]] — `TST-logger.test.ts`
- [[TST - matching.test.ts]] — `TST-matching.test.ts`
- [[TST - oracleCapabilities.test.ts]] — `TST-oracleCapabilities.test.ts`
- [[TST - oracleClient.test.ts]] — `TST-oracleClient.test.ts`
- [[TST - oracleRunner.test.ts]] — `TST-oracleRunner.test.ts`
- [[TST - quickfix.test.ts]] — `TST-quickfix.test.ts`
- [[TST - quickfixActivation.test.ts]] — `TST-quickfixActivation.test.ts`
- [[TST - results.test.ts]] — `TST-results.test.ts`
- [[TST - runner.test.ts]] — `TST-runner.test.ts`
- [[TST - schemaRun.test.ts]] — `TST-schemaRun.test.ts`
- [[TST - state.test.ts]] — `TST-state.test.ts`
- [[TST - statusBar.test.ts]] — `TST-statusBar.test.ts`
- [[TST - suiteParser.test.ts]] — `TST-suiteParser.test.ts`
- [[TST - testTree.test.ts]] — `TST-testTree.test.ts`
- [[TST - v012-features.test.ts]] — `TST-v012-features.test.ts`
- [[TST - viewCoverage.test.ts]] — `TST-viewCoverage.test.ts`
<!-- brain:auto:end -->
