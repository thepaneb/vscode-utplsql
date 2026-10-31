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
- [[Mapa - matriz de bancos]]
- [[TST - anyBudget.test.ts]] — `TST-anyBudget.test.ts`
- [[TST - autoRun.test.ts]] — `TST-autoRun.test.ts`
- [[TST - brainBuild.test.ts]] — `TST-brainBuild.test.ts`
- [[TST - brainRules.test.ts]] — `TST-brainRules.test.ts`
- [[TST - brainScripts.test.ts]] — `TST-brainScripts.test.ts`
- [[TST - charsetSupport.test.ts]] — `TST-charsetSupport.test.ts`
- [[TST - cobertura.test.ts]] — `TST-cobertura.test.ts`
- [[TST - codelens.test.ts]] — `TST-codelens.test.ts`
- [[TST - commandsE2E.test.ts]] — `TST-commandsE2E.test.ts`
- [[TST - compilationDiagnostics.test.ts]] — `TST-compilationDiagnostics.test.ts`
- [[TST - compilationDiagnosticsDriverMissing.test.ts]] — `TST-compilationDiagnosticsDriverMissing.test.ts`
- [[TST - compilationDiagnosticsE2E.test.ts]] — `TST-compilationDiagnosticsE2E.test.ts`
- [[TST - compileForDebugPool.test.ts]] — `TST-compileForDebugPool.test.ts`
- [[TST - config.test.ts]] — `TST-config.test.ts`
- [[TST - connectionProfiles.test.ts]] — `TST-connectionProfiles.test.ts`
- [[TST - connectionRedaction.test.ts]] — `TST-connectionRedaction.test.ts`
- [[TST - coverage.test.ts]] — `TST-coverage.test.ts`
- [[TST - coverageDecision.test.ts]] — `TST-coverageDecision.test.ts`
- [[TST - coverageHtml.test.ts]] — `TST-coverageHtml.test.ts`
- [[TST - dbMatrixSummary.test.ts]] — `TST-dbMatrixSummary.test.ts`
- [[TST - dbmsDebug.test.ts]] — `TST-dbmsDebug.test.ts`
- [[TST - dbPaths.test.ts]] — `TST-dbPaths.test.ts`
- [[TST - dbSourceProvider.test.ts]] — `TST-dbSourceProvider.test.ts`
- [[TST - debounce.test.ts]] — `TST-debounce.test.ts`
- [[TST - debugCommands.test.ts]] — `TST-debugCommands.test.ts`
- [[TST - debugger-liveRuntime.test.ts]] — `TST-debugger-liveRuntime.test.ts`
- [[TST - debugger.test.ts]] — `TST-debugger.test.ts`
- [[TST - debuggerE2E.test.ts]] — `TST-debuggerE2E.test.ts`
- [[TST - debuggerExceptionE2E.test.ts]] — `TST-debuggerExceptionE2E.test.ts`
- [[TST - debuggerStandaloneFn.test.ts]] — `TST-debuggerStandaloneFn.test.ts`
- [[TST - debugTargets.test.ts]] — `TST-debugTargets.test.ts`
- [[TST - decorations.test.ts]] — `TST-decorations.test.ts`
- [[TST - discovery.test.ts]] — `TST-discovery.test.ts`
- [[TST - docsFeaturesCheck.test.ts]] — `TST-docsFeaturesCheck.test.ts`
- [[TST - docsFidelity.test.ts]] — `TST-docsFidelity.test.ts`
- [[TST - docsFidelityNls.test.ts]] — `TST-docsFidelityNls.test.ts`
- [[TST - docsTables.test.ts]] — `TST-docsTables.test.ts`
- [[TST - esbuildConfig.test.ts]] — `TST-esbuildConfig.test.ts`
- [[TST - extension.test.ts]] — `TST-extension.test.ts`
- [[TST - extensionActivation.test.ts]] — `TST-extensionActivation.test.ts`
- [[TST - fsErrorsCatch.test.ts]] — `TST-fsErrorsCatch.test.ts`
- [[TST - i18n.test.ts]] — `TST-i18n.test.ts`
- [[TST - integration-compileForDebug.test.ts]] — `TST-integration-compileForDebug.test.ts`
- [[TST - jumpToFailureE2E.test.ts]] — `TST-jumpToFailureE2E.test.ts`
- [[TST - junit.test.ts]] — `TST-junit.test.ts`
- [[TST - languageIdentity.test.ts]] — `TST-languageIdentity.test.ts`
- [[TST - lintScope.test.ts]] — `TST-lintScope.test.ts`
- [[TST - logger.test.ts]] — `TST-logger.test.ts`
- [[TST - manifestDebugger.test.ts]] — `TST-manifestDebugger.test.ts`
- [[TST - matching.test.ts]] — `TST-matching.test.ts`
- [[TST - matrixConfig.test.ts]] — `TST-matrixConfig.test.ts`
- [[TST - multiRootE2E.test.ts]] — `TST-multiRootE2E.test.ts`
- [[TST - oracleCapabilities.test.ts]] — `TST-oracleCapabilities.test.ts`
- [[TST - oracleClient.test.ts]] — `TST-oracleClient.test.ts`
- [[TST - oracledb-default-absent.test.ts]] — `TST-oracledb-default-absent.test.ts`
- [[TST - oracledb-missing-catch.test.ts]] — `TST-oracledb-missing-catch.test.ts`
- [[TST - oracledbDefaultPresent.test.ts]] — `TST-oracledbDefaultPresent.test.ts`
- [[TST - oracleIdentifiers.test.ts]] — `TST-oracleIdentifiers.test.ts`
- [[TST - oraclePoll.test.ts]] — `TST-oraclePoll.test.ts`
- [[TST - oracleRunCall.test.ts]] — `TST-oracleRunCall.test.ts`
- [[TST - oracleRunner.test.ts]] — `TST-oracleRunner.test.ts`
- [[TST - oracleRunnerReporters.test.ts]] — `TST-oracleRunnerReporters.test.ts`
- [[TST - oracleRunnerTns.test.ts]] — `TST-oracleRunnerTns.test.ts`
- [[TST - packageTarget.test.ts]] — `TST-packageTarget.test.ts`
- [[TST - plsqlDeclarations.test.ts]] — `TST-plsqlDeclarations.test.ts`
- [[TST - prd015ExtraE2E.test.ts]] — `TST-prd015ExtraE2E.test.ts`
- [[TST - prd70-sqlplus.test.ts]] — `TST-prd70-sqlplus.test.ts`
- [[TST - profileCommands.test.ts]] — `TST-profileCommands.test.ts`
- [[TST - profileSecretStorageE2E.test.ts]] — `TST-profileSecretStorageE2E.test.ts`
- [[TST - quickfix.test.ts]] — `TST-quickfix.test.ts`
- [[TST - quickfixActivation.test.ts]] — `TST-quickfixActivation.test.ts`
- [[TST - redact.test.ts]] — `TST-redact.test.ts`
- [[TST - rerun.test.ts]] — `TST-rerun.test.ts`
- [[TST - results.test.ts]] — `TST-results.test.ts`
- [[TST - resultsUnreadable.test.ts]] — `TST-resultsUnreadable.test.ts`
- [[TST - runByTagCommand.test.ts]] — `TST-runByTagCommand.test.ts`
- [[TST - runCommands.test.ts]] — `TST-runCommands.test.ts`
- [[TST - runCommandsExec.test.ts]] — `TST-runCommandsExec.test.ts`
- [[TST - runExportCommand.test.ts]] — `TST-runExportCommand.test.ts`
- [[TST - runner.test.ts]] — `TST-runner.test.ts`
- [[TST - runRelated.test.ts]] — `TST-runRelated.test.ts`
- [[TST - runTimeoutE2E.test.ts]] — `TST-runTimeoutE2E.test.ts`
- [[TST - scaffold.test.ts]] — `TST-scaffold.test.ts`
- [[TST - scaffoldCommands.test.ts]] — `TST-scaffoldCommands.test.ts`
- [[TST - scaffoldDatabaseSource.test.ts]] — `TST-scaffoldDatabaseSource.test.ts`
- [[TST - schemaRun.test.ts]] — `TST-schemaRun.test.ts`
- [[TST - scriptCommands.test.ts]] — `TST-scriptCommands.test.ts`
- [[TST - scriptCommandsExec.test.ts]] — `TST-scriptCommandsExec.test.ts`
- [[TST - scriptRunner.test.ts]] — `TST-scriptRunner.test.ts`
- [[TST - scriptsCli.test.ts]] — `TST-scriptsCli.test.ts`
- [[TST - scriptsHardening.test.ts]] — `TST-scriptsHardening.test.ts`
- [[TST - selectReporterCommand.test.ts]] — `TST-selectReporterCommand.test.ts`
- [[TST - snippets.test.ts]] — `TST-snippets.test.ts`
- [[TST - state.test.ts]] — `TST-state.test.ts`
- [[TST - statusBar.test.ts]] — `TST-statusBar.test.ts`
- [[TST - suiteParser.test.ts]] — `TST-suiteParser.test.ts`
- [[TST - tagFilter.test.ts]] — `TST-tagFilter.test.ts`
- [[TST - tagsStreamingE2E.test.ts]] — `TST-tagsStreamingE2E.test.ts`
- [[TST - testTree.test.ts]] — `TST-testTree.test.ts`
- [[TST - thickLegacyE2E.test.ts]] — `TST-thickLegacyE2E.test.ts`
- [[TST - thickMode.test.ts]] — `TST-thickMode.test.ts`
- [[TST - tnsnames.test.ts]] — `TST-tnsnames.test.ts`
- [[TST - unit-compileForDebug.test.ts]] — `TST-unit-compileForDebug.test.ts`
- [[TST - utilityCommands.test.ts]] — `TST-utilityCommands.test.ts`
- [[TST - utilityCommandsDriverMissing.test.ts]] — `TST-utilityCommandsDriverMissing.test.ts`
- [[TST - v012-features.test.ts]] — `TST-v012-features.test.ts`
- [[TST - v013-features.test.ts]] — `TST-v013-features.test.ts`
- [[TST - v014-features.test.ts]] — `TST-v014-features.test.ts`
- [[TST - v014-tns.test.ts]] — `TST-v014-tns.test.ts`
- [[TST - v016-features.test.ts]] — `TST-v016-features.test.ts`
- [[TST - v017-features.test.ts]] — `TST-v017-features.test.ts`
- [[TST - viewCoverage.test.ts]] — `TST-viewCoverage.test.ts`
- [[TST - viewCoverageDenied.test.ts]] — `TST-viewCoverageDenied.test.ts`
- [[TST - viewCoverageE2E.test.ts]] — `TST-viewCoverageE2E.test.ts`
- [[TST - virtualSource.test.ts]] — `TST-virtualSource.test.ts`
- [[TST - vscodeApiInventory.test.ts]] — `TST-vscodeApiInventory.test.ts`
- [[TST - vsixIgnore.test.ts]] — `TST-vsixIgnore.test.ts`
- [[TST - workflowPolicy.test.ts]] — `TST-workflowPolicy.test.ts`
<!-- brain:auto:end -->
