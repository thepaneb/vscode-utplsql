---
tipo: moc
status: ativo
verificado: 2026-09-24
tags: [moc, codigo]
---

# MOC - Código

Notas **geradas** (`COD-*`) — uma por arquivo de `src/` referenciado em
`implementacao:` nas camadas (regras/NFR/segurança/erros). Como o Obsidian não
coloca arquivos fora do vault no grafo, estas notas servem de **nós** para ligar
o conhecimento ao código que o implementa. **Não edite** (regeneradas por
`npm run brain:sync`).

## Módulos

```dataview
TABLE arquivo, file.mtime AS "Atualizado"
FROM "21-Codigo"
WHERE tipo = "codigo"
SORT id ASC
```

## Índice (links)

<!-- brain:auto:start:moc-index -->
- [[COD - .gitignore]] — `COD-.gitignore`
- [[COD - codelens.ts]] — `COD-codelens.ts`
- [[COD - compilationDiagnostics.ts]] — `COD-compilationDiagnostics.ts`
- [[COD - compileForDebug.ts]] — `COD-compileForDebug.ts`
- [[COD - config.ts]] — `COD-config.ts`
- [[COD - connectionProfiles.ts]] — `COD-connectionProfiles.ts`
- [[COD - coverage.ts]] — `COD-coverage.ts`
- [[COD - discovery.ts]] — `COD-discovery.ts`
- [[COD - extension.ts]] — `COD-extension.ts`
- [[COD - i18n.ts]] — `COD-i18n.ts`
- [[COD - i18nLocales.ts]] — `COD-i18nLocales.ts`
- [[COD - junit.ts]] — `COD-junit.ts`
- [[COD - logger.ts]] — `COD-logger.ts`
- [[COD - matching.ts]] — `COD-matching.ts`
- [[COD - oracleClient.ts]] — `COD-oracleClient.ts`
- [[COD - oracleRunner.ts]] — `COD-oracleRunner.ts`
- [[COD - package.json]] — `COD-package.json`
- [[COD - quickfix.ts]] — `COD-quickfix.ts`
- [[COD - results.ts]] — `COD-results.ts`
- [[COD - run.ts]] — `COD-run.ts`
- [[COD - runner.ts]] — `COD-runner.ts`
- [[COD - state.ts]] — `COD-state.ts`
- [[COD - statusBar.ts]] — `COD-statusBar.ts`
- [[COD - suiteParser.ts]] — `COD-suiteParser.ts`
- [[COD - testTree.ts]] — `COD-testTree.ts`
- [[COD - utility.ts]] — `COD-utility.ts`
- [[COD - viewCoverage.ts]] — `COD-viewCoverage.ts`
<!-- brain:auto:end -->
