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
- [[COD - annotation.ts]] — `COD-annotation.ts`
- [[COD - bootstrap.sh]] — `COD-bootstrap.sh`
- [[COD - brain-build.cjs]] — `COD-brain-build.cjs`
- [[COD - brain-gaps.cjs]] — `COD-brain-gaps.cjs`
- [[COD - brain-rules.cjs]] — `COD-brain-rules.cjs`
- [[COD - brain.cjs]] — `COD-brain.cjs`
- [[COD - charset.ts]] — `COD-charset.ts`
- [[COD - charsetSupport.ts]] — `COD-charsetSupport.ts`
- [[COD - cobertura.ts]] — `COD-cobertura.ts`
- [[COD - codelens.ts]] — `COD-codelens.ts`
- [[COD - compilationDiagnostics.ts]] — `COD-compilationDiagnostics.ts`
- [[COD - compileForDebug.ts]] — `COD-compileForDebug.ts`
- [[COD - config.ts]] — `COD-config.ts`
- [[COD - connection.ts]] — `COD-connection.ts`
- [[COD - connectionProfiles.ts]] — `COD-connectionProfiles.ts`
- [[COD - coverage.ts]] — `COD-coverage.ts`
- [[COD - coverageDecision.ts]] — `COD-coverageDecision.ts`
- [[COD - create-pr.cjs]] — `COD-create-pr.cjs`
- [[COD - create-release.cjs]] — `COD-create-release.cjs`
- [[COD - dbmsDebug.ts]] — `COD-dbmsDebug.ts`
- [[COD - dbSourceProvider.ts]] — `COD-dbSourceProvider.ts`
- [[COD - debounce.ts]] — `COD-debounce.ts`
- [[COD - debug.ts]] — `COD-debug.ts`
- [[COD - debugger.ts]] — `COD-debugger.ts`
- [[COD - debugTargets.ts]] — `COD-debugTargets.ts`
- [[COD - decorations.ts]] — `COD-decorations.ts`
- [[COD - deps.ts]] — `COD-deps.ts`
- [[COD - discovery.ts]] — `COD-discovery.ts`
- [[COD - docs-check.cjs]] — `COD-docs-check.cjs`
- [[COD - docs-fidelity.cjs]] — `COD-docs-fidelity.cjs`
- [[COD - esbuild.config.mjs]] — `COD-esbuild.config.mjs`
- [[COD - extension.ts]] — `COD-extension.ts`
- [[COD - gen-diagrams.cjs]] — `COD-gen-diagrams.cjs`
- [[COD - gen-icon.cjs]] — `COD-gen-icon.cjs`
- [[COD - helpers.ts]] — `COD-helpers.ts`
- [[COD - i18n.ts]] — `COD-i18n.ts`
- [[COD - i18nLocales.ts]] — `COD-i18nLocales.ts`
- [[COD - junit.ts]] — `COD-junit.ts`
- [[COD - logger.ts]] — `COD-logger.ts`
- [[COD - matching.ts]] — `COD-matching.ts`
- [[COD - matrix.env]] — `COD-matrix.env`
- [[COD - obsidian-mcp.py]] — `COD-obsidian-mcp.py`
- [[COD - oracleClient.ts]] — `COD-oracleClient.ts`
- [[COD - oracleRunner.ts]] — `COD-oracleRunner.ts`
- [[COD - package-target.cjs]] — `COD-package-target.cjs`
- [[COD - package.json]] — `COD-package.json`
- [[COD - parse-version.cjs]] — `COD-parse-version.cjs`
- [[COD - plsqlDeclarations.ts]] — `COD-plsqlDeclarations.ts`
- [[COD - profile.ts]] — `COD-profile.ts`
- [[COD - publish.cjs]] — `COD-publish.cjs`
- [[COD - quickfix.ts]] — `COD-quickfix.ts`
- [[COD - results.ts]] — `COD-results.ts`
- [[COD - run-tests.cjs]] — `COD-run-tests.cjs`
- [[COD - run.sh]] — `COD-run.sh`
- [[COD - run.ts]] — `COD-run.ts`
- [[COD - runner.ts]] — `COD-runner.ts`
- [[COD - script.ts]] — `COD-script.ts`
- [[COD - scriptRunner.ts]] — `COD-scriptRunner.ts`
- [[COD - state.ts]] — `COD-state.ts`
- [[COD - statusBar.ts]] — `COD-statusBar.ts`
- [[COD - suiteParser.ts]] — `COD-suiteParser.ts`
- [[COD - sync-prds.cjs]] — `COD-sync-prds.cjs`
- [[COD - tagFilter.ts]] — `COD-tagFilter.ts`
- [[COD - test-setup.cjs]] — `COD-test-setup.cjs`
- [[COD - testTree.ts]] — `COD-testTree.ts`
- [[COD - tnsnames.ts]] — `COD-tnsnames.ts`
- [[COD - types.ts]] — `COD-types.ts`
- [[COD - utility.ts]] — `COD-utility.ts`
- [[COD - viewCoverage.ts]] — `COD-viewCoverage.ts`
- [[COD - virtualSource.ts]] — `COD-virtualSource.ts`
- [[COD - vsce.cjs]] — `COD-vsce.cjs`
- [[COD - vscode-api-inventory.cjs]] — `COD-vscode-api-inventory.cjs`
- [[COD - vscode-stub.ts]] — `COD-vscode-stub.ts`
- [[COD - wait-ready.sh]] — `COD-wait-ready.sh`
<!-- brain:auto:end -->
