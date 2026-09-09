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
| **Descoberta** | `suiteParser.ts`, `discovery.ts` | Encontrar suites/testes nos arquivos `.pks` via regex `%suite`/`%test` + annotations estendidas; no modo schema, complementa com descoberta via banco (`ALL_OBJECTS`/`ALL_SOURCE`) |
| **Execução** | `runner.ts`, `oracleRunner.ts` | Executar testes via Oracle direto (com connection pooling) |
| **Resultados** | `junit.ts`, `results.ts`, `cliReporters.ts`, `cliInfo.ts`, `matching.ts` | Parse do XML JUnit, mapeamento para `vscode.TestItem` (funções canônicas compartilhadas) |
| **Cobertura** | `cobertura.ts`, `coverage.ts` | Parse do XML Cobertura, mapeamento para arquivos fonte |
| **UX** | `codelens.ts`, `statusBar.ts`, `decorations.ts` | CodeLens, StatusBar, decorações inline |
| **Diagnósticos** | `compilationDiagnostics.ts`, `quickfix.ts` | Erros PL/SQL no editor, validação de setup/integridade UT3 com quick-fix |
| **Configuração** | `config.ts`, `state.ts`, `types.ts` | Settings, conexão, estado persistente |
| **Orquestração** | `extension.ts` | Registro de comandos, providers, ciclo de vida |

### Separação módulos puros vs vscode

| Puro (testável com `node --test`) | Depende de `vscode` |
|---|---|
| `suiteParser.ts`, `junit.ts`, `cobertura.ts` | `extension.ts`, `runner.ts`, `results.ts` |
| `matching.ts` | `config.ts` |
| `cliInfo.ts`, `cliReporters.ts`, `codelens.ts` (parse) | `discovery.ts`, `coverage.ts`, `oracleRunner.ts` |
| `state.ts`, `types.ts` | `decorations.ts`, `statusBar.ts`, `compilationDiagnostics.ts`, `quickfix.ts` |

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
