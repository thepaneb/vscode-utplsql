# Arquitetura

Visão geral da arquitetura interna da extensão para contribuidores.

## Fluxo de execução

```
discovery (.pks) → executeRun (runner.ts) monta: utplsql run <conn> -p=<suites>
  -f=ut_junit_reporter -o=results.xml          → parseJUnit  → run.passed/failed
  -f=ut_coverage_cobertura_reporter -o=cov.xml  → parseCobertura → run.addCoverage
  -f=ut_documentation_reporter -c (stdout)      → run.appendOutput
```

`src/extension.ts` é o orquestrador. `src/runner.ts` contém `executeRun` e
`applyResults`.

## Separação crítica: módulos puros vs vscode-dependentes

| Puro (testável com `node --test`) | Depende de `vscode` |
|---|---|
| `suiteParser.ts` — regex `%suite`/`%test` | `extension.ts` |
| `junit.ts` — parse XML JUnit | `runner.ts` |
| `cobertura.ts` — parse XML Cobertura | `config.ts` |
| `invocation.ts` — monta args CLI | `cli.ts` |
| `matching.ts` — filtro por URI/pasta | `discovery.ts` |
| `cliInfo.ts` — parse `utplsql info` | `coverage.ts` |
| `cliReporters.ts` — parse `utplsql reporters` | |
| `state.ts`, `types.ts` (type-only) | |

Módulos da coluna esquerda **não importam `vscode`** e são testáveis com
`node --test` sem qualquer setup.

## Fluxo de dados das configurações

```
package.json                    config.ts (readConfig)              runner.ts (executeRun)
────────────                    ──────────────────────              ──────────────────────
utplsql.cliPath         →       cfg.cliPath             →           invocation.ts (file)
utplsql.sourcePath      →       cfg.sourcePath          →           -source_path / resolveSourceUri
utplsql.includePatterns →       cfg.includePatterns     →           discovery.ts (findFiles)
utplsql.invocation      →       cfg.invocation          →           invocation.ts (launcher vs java)
utplsql.timeoutMinutes  →       cfg.timeoutMinutes      →           -t=N (só se !=60)
utplsql.dbmsOutput      →       cfg.dbmsOutput          →           -D (só se true)
utplsql.quiet           →       cfg.quiet               →           -q (só se true)
utplsql.failureExitCode →       cfg.failureExitCode     →           --failure-exit-code (só se !=1)
utplsql.additionalReporters →  cfg.additionalReporters  →           -f= flags (deduplicados)

utplsql.connection      →       resolveConnection()     →           connection param CLI
UTPLSQL_CONN (env)      →       resolveConnection() p2  →           connection param CLI
```

## Test infrastructure

### vscode stub

Módulos que importam `vscode` (coluna da direita) usam um sistema de stub
em duas camadas:

1. **Por teste** — `src/test/unit/setup.ts` redireciona `require('vscode')`
   para `src/test/vscode-stub.ts`
2. **Runner global** — `scripts/run-tests.cjs` com `--require scripts/test-setup.cjs`
   como rede de segurança

### Testes de integração

`npm run test:integration` sobe uma instância VSCode via `@vscode/test-cli`.
Requer banco Oracle real + `UTPLSQL_CONN`, `UTPLSQL_CLI_PATH`, `UTPLSQL_CLI_HOME`
definidos em `.env`.

## Mapeamento resultado → teste

`applyResults` em `runner.ts` usa heurística: casa por `package`
(último segmento do `classname` JUnit) + nome/descrição do teste,
com fallback por nome. O índice é escopado por package para minimizar
ambiguidade.

## Resolução de arquivos de cobertura

`resolveSourceUri` em `coverage.ts` tenta:
1. Caminho absoluto (já resolvido)
2. Relativo ao workspace folder
3. Relativo ao `sourcePath`
