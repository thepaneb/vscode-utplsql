---
tipo: funcional
status: ativo
titulo: "Especificação Funcional — visão geral"
publicar: docs/functional/README.md
verificado: 2026-09-23
tags: [funcional]
---

# Especificação Funcional — vscode-utplsql

Extensão VSCode para execução de testes utPLSQL (Oracle PL/SQL) integrada ao Test
Explorer nativo, com suporte a cobertura de código, diagnósticos e organização
por schema.

## Visão geral

```
discovery (.pks + banco)  ──►  executeRun  ──►  Oracle direto  ──►  parseJUnit  ──►  Test Explorer
                                       │                                      │
                                       └─► parseCobertura  ──►  Coverage gutters
```

### Arquitetura de alto nível

| Camada | Módulos | Responsabilidade |
|---|---|---|
| **Descoberta** | `suiteParser.ts`, `discovery.ts`, `testTree.ts` | Encontrar suites/testes nos arquivos `.pks` via regex `%suite`/`%test` + annotations estendidas; no modo schema, usa `ut_runner.get_suites_info` (DB-first, PRD-74) com fallback para `ALL_OBJECTS`/`ALL_SOURCE`; monta a árvore e mescla DB/arquivo |
| **Execução** | `runner.ts`, `oracleRunner.ts`, `scriptRunner.ts`, `debugger.ts`, `dbmsDebug.ts`, `compileForDebug.ts` | Executar testes via Oracle direto (com connection pooling), scripts SQL/PL-SQL e depuração (incl. compilar para debug) |
| **Resultados** | `junit.ts`, `results.ts`, `matching.ts` | Parse do XML JUnit, mapeamento para `vscode.TestItem` (funções canônicas compartilhadas) |
| **Cobertura** | `cobertura.ts`, `coverage.ts`, `viewCoverage.ts`, `plsqlDeclarations.ts` | Parse do XML Cobertura, mapeamento para arquivos fonte, cobertura de views e por declaração |
| **UX** | `codelens.ts`, `statusBar.ts`, `decorations.ts` | CodeLens, StatusBar, decorações inline |
| **Diagnósticos** | `compilationDiagnostics.ts`, `quickfix.ts` + `oracleRunner.checkCompilationErrors()` | Erros de compilação PL/SQL (`ALL_ERRORS` → Problems Panel, pós-run) e validação de setup/integridade UT3 com quick-fix |
| **Configuração** | `config.ts`, `state.ts`, `types.ts`, `connectionProfiles.ts`, `i18n.ts`, `i18nLocales.ts`, `oracleClient.ts` | Settings, conexão, perfis, i18n, modo thin/thick e estado persistente |
| **Infra** | `charset.ts`, `charsetSupport.ts`, `logger.ts`, `debounce.ts`, `dbSourceProvider.ts` | Decodificação de charset, detecção de charset legado, logging, coalescência e documentos virtuais `utplsql-db:` |
| **Orquestração** | `extension.ts`, `commands/` | Registro de comandos, providers, ciclo de vida; handlers agrupados por área (`run`, `script`, `connection`, `profile`, `debug`, `utility`, `deps`) |

### Separação módulos puros vs vscode

| Puro (testável com `node --test`) | Depende de `vscode` |
|---|---|
| `suiteParser.ts`, `junit.ts`, `cobertura.ts`, `i18n.ts`, `i18nLocales.ts` | `extension.ts`, `runner.ts`, `config.ts` |
| `matching.ts`, `plsqlDeclarations.ts`, `charset.ts`, `charsetSupport.ts` | `discovery.ts`, `coverage.ts`, `viewCoverage.ts` |
| `codelens.ts` (parse), `state.ts`, `types.ts`, `scriptRunner.ts`, `logger.ts`, `debounce.ts` | `decorations.ts`, `statusBar.ts` (classe), `oracleRunner.ts`, `results.ts`, `testTree.ts` |
| | `connectionProfiles.ts`, `debugger.ts`, `quickfix.ts`, `compileForDebug.ts`, `oracleClient.ts`, `commands/` |

### Context keys

| Key | Quando |
|---|---|
| `utplsql:activated` | Extensão ativada |
| `utplsql:running` | Execução em andamento |
| `utplsql:connected` | Conexão resolvida |
| `utplsql:hasFailures` | Último run teve falhas |

### Padrões de arquivo

- Test specs: `**/*.pks` com annotations `--%suite` e `--%test`
- CodeLens: registrado em `{ scheme: 'file', pattern: '**/*.pks' }` (sem `language: 'plsql'`)

## Índice

| # | Documento | Descrição |
|---|---|---|
| 01 | [Test Discovery](01-test-discovery.md) | Como suites e testes são descobertos nos arquivos `.pks` |
| 02 | [Test Execution](02-test-execution.md) | Execução (Oracle streaming), cancelamento |
| 03 | [Results and Reporting](03-results-and-reporting.md) | Parse JUnit, mapping resultado→TestItem, reporters |
| 04 | [Code Coverage](04-code-coverage.md) | Parse Cobertura, source mapping, grants |
| 05 | [UX Components](05-ux-components.md) | CodeLens, StatusBar, Decorations, Keybindings |
| 06 | [Tree Organization](06-tree-organization.md) | Modos file/schema, extração de schema |
| 07 | [Diagnostics and Validation](07-diagnostics-and-validation.md) | Compilação PL/SQL, setup validation, quick-fix |
| 08 | [Jump to Failure](08-jump-to-failure.md) | Stack trace parse, message.location, Go to Error |
| 09 | [Configuration](09-configuration.md) | Settings, conexão, env vars, segurança |
| 10 | [Development Tooling](10-development-tooling.md) | TS coverage, CI, PRDs, stub de testes |
| 11 | [PL/SQL Debugger](11-debugger.md) | Debug de testes via `DBMS_DEBUG` (DAP `utplsql`) |
