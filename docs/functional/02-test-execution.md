# 02 — Test Execution

Execução de testes utPLSQL via CLI ou conexão Oracle direta.

## Modos de execução

| Modo | Setting | Mecanismo |
|---|---|---|
| **CLI** | `runnerMode: cli` | Spawn `utplsql run` como processo filho |
| **Oracle direto** | `runnerMode: oracle` | `node-oracledb` com 2 conexões (run + polling) |
| **Auto** | `runnerMode: auto` (default) | Tenta Oracle direto; fallback CLI se `oracledb` indisponível |

## Fluxo — `executeRun()`

```
executeRun(controller, request, token, coverage, state, onSuiteStart, onComplete)
    │
    ├─► resolveConnection() → connection string
    ├─► readConfig() → cfg (inclui runnerMode)
    ├─► resolve items (include / all suites)
    │       └─► pathArgs = Set de nomes de package
    │
    ├─► runnerMode === 'oracle' || runnerMode === 'auto'
    │       ├─► tenta executeRunOracle(...)
    │       │       ├─► sucesso → run.end() → return
    │       │       └─► erro + runnerMode === 'oracle' → errored todos → return
    │       └─► fallback: continua com CLI
    │
    ├─► CLI: monta args (run, connection, paths, reporters, flags)
    │       └─► buildInvocation(cfg, args) → { file, args, shell }
    │
    ├─► runCli(file, args, shell, cwd, token, onStdout)
    │       └─► child_process.spawn (com ou sem shell)
    │
    ├─► parseJUnit(results.xml) → TestCaseResult[]
    ├─► applyResults() → Map<TestItem.id, {status, message}>
    ├─► applyCoverage() → gutters + FileCoverage
    ├─► compilationDiagnostics.parseAndApply() (se habilitado)
    │
    └─► limpeza: fs.rmSync(tmpDir) + run.end()
```

## CLI mode — detalhes

### `buildInvocation` (src/invocation.ts)

```typescript
function buildInvocation(cfg: InvocationConfig, cliArgs: string[]): Spawn | InvocationError
```

**Modo `launcher`** (shell=true):
- `file = cfg.cliPath`, `args = cliArgs`, `shell = true`
- Windows: `cmd.exe /d /c cliPath args...`

**Modo `java`** (shell=false):
- `file = cfg.javaPath || 'java'`
- `args = [...cfg.javaArgs, '-cp', classpath, '-Dapp.*', UTPLSQL_MAIN_CLASS, ...cliArgs]`
- classpath: `<cliHome>/etc` + `<cliHome>/lib/*`
- `javaArgs` (default `['-Xmx256m']`) inserido antes de `-cp`

### `runCli` (src/cli.ts)

```typescript
function runCli(
  file: string,
  args: string[],
  shell: boolean,
  cwd: string,
  token: CancellationToken,
  onStdout?: (chunk: string) => void,
): Promise<CliResult>
```

- `shell=true`: usa `cmd.exe /d /c` no Windows, `sh -c` no Linux
- `shell=false`: spawn direto (array de args, sem quoting)
- Callback `onStdout` em streaming (documentation reporter)
- Cancelamento: `token.onCancellationRequested` → `child.kill()`
- Timeout: configurado via `utplsql.timeoutMinutes` → flag `-t`

### Argumentos do CLI

```
utplsql run <conn> -p=<suite> -f=ut_documentation_reporter -c
  -f=ut_junit_reporter -o=<tmpDir>/results.xml
  -f=ut_coverage_cobertura_reporter -o=<tmpDir>/coverage.xml
  -source_path=<sourcePath> -owner=<owner> <coverageSourceArgs>
  -t=<timeoutMinutes>  (se !== 60)
  -D                    (se dbmsOutput)
  -q                    (se quiet)
  --failure-exit-code=N (se !== 1)
  <extraRunArgs>
  <additionalReporters>
```

## Oracle direto — detalhes

### `executeRunOracle` (src/oracleRunner.ts)

```typescript
async function executeRunOracle(
  connection: string,
  pathArgs: string[],
  coverage: boolean,
  sourcePath: string,
  root: string,
  run: vscode.TestRun,
  leafTests: vscode.TestItem[],
  state: TestStateManager,
  token: vscode.CancellationToken,
  onComplete?: (...) => void,
  folders?: WorkspaceFolder[],
): Promise<void>
```

1. **Import dinâmica**: `const oracledb = await import('oracledb')` — falha se não instalado
2. **Schema discovery**: `discoverUtplsqlSchema(conn1)` — query `ALL_SYNONYMS` para prefixo
3. **Limpeza**: `DELETE FROM ${utSchema}UT_OUTPUT_BUFFER_TMP` + `UT_OUTPUT_BUFFER_INFO_TMP`
4. **Execução**: `conn1.execute('BEGIN ut_runner.run(...) END;')` — bloqueante
5. **Polling**: `conn2.execute('SELECT ... FROM UT_OUTPUT_BUFFER_TMP WHERE message_id > :last')` a cada 200ms
6. **Separacão doc/JUnit**: linhas iniciando com `<` são XML → acumular; demais → `run.appendOutput()`
7. **Parse final**: `parseJUnit(xmlBuffer)` → `applyResultsFromCases()` + `applyCoverageFromXml()`
8. **Cancelamento**: `conn1.break()` / `conn2.break()` + `Promise.race` com cancellation promise

### `discoverUtplsqlSchema`

```typescript
async function discoverUtplsqlSchema(conn): Promise<string>
```

Query `ALL_SYNONYMS` para `UT_RUNNER` com owner `PUBLIC`. Retorna `"UT3."` se
encontrado (shared install), ou `""` se mesmo schema.

### `parseConnString`

```typescript
function parseConnString(connStr: string): { user, password, connectionString }
```

Parse da string `user/pass@//host:port/service` para objeto de configuração do
`oracledb.getConnection()`.

### Fluxo de dados

```
conn1 (run)                              conn2 (poll)
    │                                        │
    ├─► ut_runner.run(...)                   ├─► LOOP a cada 200ms:
    │       ├─► doc_reporter                 │       SELECT message_id, text, is_finished
    │       ├─► junit_reporter               │       FROM UT_OUTPUT_BUFFER_TMP
    │       └─► coverage_reporter            │       WHERE message_id > :last
    │                                        │       ORDER BY message_id
    │                                        │
    └─► (bloqueante até fim)                 ├─► doc text → run.appendOutput()
                                             ├─► XML lines → acumular
                                             └─► done → sair do loop
```

## Cancelamento

- **CLI**: `token.onCancellationRequested` → `child.kill()` → processo termina
- **Oracle**: `token.onCancellationRequested` → `conn.break()` → `ut_runner.run` interrompido
- Ambos retornam `run.end()` após cancelamento

## Settings

| Setting | Default | Descrição |
|---|---|---|
| `utplsql.runnerMode` | `auto` | `auto`, `cli`, `oracle` |
| `utplsql.invocation` | `launcher` | `launcher` ou `java` |
| `utplsql.cliPath` | `utplsql` | Caminho do executável CLI |
| `utplsql.javaPath` | `java` | Executável Java |
| `utplsql.javaArgs` | `["-Xmx256m"]` | Flags JVM (modo java) |
| `utplsql.cliHome` | `""` | Raiz do CLI (modo java) |
| `utplsql.timeoutMinutes` | `60` | Timeout da execução |
| `utplsql.dbmsOutput` | `false` | Habilita DBMS_OUTPUT |
| `utplsql.quiet` | `false` | Suprime logs |
| `utplsql.failureExitCode` | `1` | Código de saída em falha |
| `utplsql.extraRunArgs` | `[]` | Argumentos extras |
