---
tipo: funcional
status: ativo
numero: 02
titulo: "02 — Test Execution"
publicar: docs/functional/02-test-execution.md
verificado: 2026-09-23
regras: ["BR-EXEC-001", "BR-EXEC-002", "BR-EXEC-003", "BR-EXEC-004", "BR-EXEC-005", "BR-EXEC-006", "BR-EXEC-007", "BR-EXEC-008", "BR-EXEC-009", "BR-EXEC-010", "BR-EXEC-011", "BR-EXEC-012", "BR-EXEC-013", "BR-EXEC-014"]
relacionado: ["[[NFR-004 - Latência do streaming]]", "[[NFR-005 - Cancelamento e timeout]]"]
tags: [funcional]
---
# 02 — Test Execution

Execução de testes utPLSQL via conexão Oracle direta (node-oracledb).

## Fluxo — `executeRun()`

```
executeRun(controller, request, token, coverage, state, onSuiteStart, onComplete)
    │
    ├─► resolveConnection() → connection string
    ├─► readConfig() → cfg
    ├─► resolve items (include / all suites)
    │       └─► pathArgs = Set de nomes de package
    │
    ├─► executeRunOracle(...)
    │       ├─► parseJUnit(xml do buffer Oracle) → applyResultsFromCases()
    │       │       └─► Map<TestItem.id, {status, message}> + run.passed/failed/...
    │       ├─► applyCoverageFromXml() → gutters + FileCoverage (se coverage)
    │       ├─► sucesso → run.end() → return
    │       └─► erro → errored todos → return
    │
    └─► limpeza: run.end()
```

## `executeRunOracle` (src/oracleRunner.ts)

```typescript
interface OracleRunOptions {
  connection: string;                       // user/pass@//host:port/service
  pathArgs: string[];                       // ex.: ['package', 'package.proc']
  coverage: boolean;
  sourcePath: string;
  root: string;                             // fsPath do workspace folder
  run: vscode.TestRun;
  leafTests: vscode.TestItem[];
  state: TestStateManager;
  onComplete?: (passed, failed, skipped, errored, durationMs) => void;
  folders?: readonly vscode.WorkspaceFolder[];
}

async function executeRunOracle(options: OracleRunOptions, token: CancellationToken): Promise<void>
```

1. **Import dinâmica**: `const oracledb = await import('oracledb')` — falha se não instalado
2. **Conexões**: `acquireRunnerConnections()` — pool gerenciado (veja abaixo)
3. **Schema discovery**: `discoverUtplsqlSchema(conn1)` — query `ALL_SYNONYMS` para prefixo
4. **Limpeza**: `DELETE FROM ${utSchema}UT_OUTPUT_BUFFER_TMP` + `UT_OUTPUT_BUFFER_INFO_TMP`
5. **Execução**: `conn1.execute('BEGIN ut_runner.run(...) END;')` — bloqueante
6. **Polling**: `conn2.execute('SELECT ... FROM UT_OUTPUT_BUFFER_TMP WHERE message_id > :last')` a cada 200ms
7. **Separação doc/JUnit**: linhas iniciando com `<` são XML → acumular; demais →
   `run.appendOutput()`. Dentro de um `<![CDATA[...]]>` (system-out do JUnit) as
   linhas de conteúdo e o `]]>` **não** começam com `<`, então o roteamento é
   mantido para o XML enquanto o CDATA estiver aberto (`inCdata`)
8. **Parse final**: `parseJUnit(xmlBuffer)` → `applyResultsFromCases()` + `applyCoverageFromXml()` (src/results.ts)
9. **Cancelamento**: `conn1.break()` / `conn2.break()` + `Promise.race` com cancellation promise

### Connection pooling (PRD-38)

O pool é criado **lazy** no primeiro run e gerenciado por
`oracleRunner.ts`:

```typescript
let currentPool: { pool: oracledb.Pool; key: string } | undefined;

async function ensurePool(oracledb, connection, cfg): Promise<Pool> {
  // PRD-70: inicializa o cliente thick (no-op no thin) antes de qualquer conexão
  const client = ensureOracleClient(oracledb, cfg.oracleClientMode,
                                    cfg.oracleClientLibDir, cfg.oracleClientConfigDir);
  const key = `${connection}|${cfg.oraclePoolMin}|${cfg.oraclePoolMax}|${cfg.oraclePoolIncrement}|${cfg.oraclePoolPingInterval}`;
  if (currentPool?.key === key) return currentPool.pool;   // reutiliza
  await closeOraclePool();                                  // connection/settings mudaram
  const parsed = parseConnString(connection);
  const pool = await oracledb.createPool({
    user, password, connectString,
    poolMin: cfg.oraclePoolMin,          // 2
    poolMax: cfg.oraclePoolMax,          // 10
    poolIncrement: cfg.oraclePoolIncrement, // 1
    poolPingInterval: cfg.oraclePoolPingInterval, // 60 (ping periódico das ociosas, Thin driver)
    stmtCacheSize: 30,
  });
  currentPool = { pool, key };
  return pool;
}

async function acquireRunnerConnections(oracledb, connection, cfg) {
  oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;
  const pool = await ensurePool(...).catch(() => undefined);   // fallback
  if (pool) return { conn1: await pool.getConnection(), conn2: await pool.getConnection() };
  return { conn1: await oracledb.getConnection(parseConnString(connection)), ... };  // raw
}

async function closeOraclePool(): Promise<void>  // chamado no deactivate() (drain 10s)
```

- **Keyed pela connection string + settings do pool**: conexão ou parâmetros do pool
  alterados → pool antigo fechado, novo criado
- **Modo thick (PRD-70)**: `ensurePool` chama `ensureOracleClient` (idempotente)
  antes de `createPool`; no modo `thin` (default) é no-op
- **`poolPingInterval`**: ping periódico (em segundos) das conexões **ociosas** (ping interno do Thin driver — sem `SELECT 1 FROM DUAL`); `0` = ping a cada checkout
- **`outFormat = OBJECT`** global: acessos de rows por propriedade nomeada (`TABLE_OWNER`, `MESSAGE_ID`, `TEXT`)
- **`conn.close()`** devolve ao pool; `deactivate()` fecha com drenagem de 10s

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
`oracledb` (pool e conexão raw).

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

`token.onCancellationRequested` → `conn.break()` → `ut_runner.run` interrompido → `run.end()`.

## Settings

| Setting | Default | Descrição |
|---|---|---|
| `utplsql.timeoutMinutes` | `60` | Timeout da execução (`Promise.race` com cancelamento) |
| `utplsql.oraclePoolMin` | `2` | Conexões mínimas do pool |
| `utplsql.oraclePoolMax` | `10` | Conexões máximas do pool |
| `utplsql.oraclePoolIncrement` | `1` | Incremento ao expandir o pool |
| `utplsql.oraclePoolPingInterval` | `60` | Segundos entre health checks das conexões ociosas |
| `utplsql.dbmsOutput` | `false` | `DBMS_OUTPUT.ENABLE` em conn1 e drenagem via `GET_LINE` ao final (a sessão de execução, não a de polling) |
| `utplsql.tags` | `""` | Expressão de tags do utPLSQL (`a_tags`) para filtrar quais testes executam (ex.: `fast & !integration`); vazio = todos |
| `utplsql.run.randomOrder` | `false` | Envia `a_random_test_order` ao `ut_runner.run` (revela dependências de ordem) |
| `utplsql.run.randomOrderSeed` | `0` | Seed da ordem aleatória (`0` = sorteada pelo banco; > 0 reproduz e é logada no Output) |

## Conexões

<!-- brain:auto:start:conexoes -->
- 📐 Regras: [[BR-EXEC-001 - Execução usa duas conexões dedicadas (conn1 runner, conn2 poll)|BR-EXEC-001]] · [[BR-EXEC-002 - Conexões do runner têm callTimeout zerado|BR-EXEC-002]] · [[BR-EXEC-003 - Falha na segunda conexão libera a primeira (sem vazamento)|BR-EXEC-003]] · [[BR-EXEC-004 - Prefixo de schema utPLSQL descoberto via ALL_SYNONYMS|BR-EXEC-004]] · [[BR-EXEC-005 - Buffer de saída é limpo antes de cada run|BR-EXEC-005]] · [[BR-EXEC-006 - Reporters gravam na mesma UT_OUTPUT_BUFFER_TMP; CLOB não é usada|BR-EXEC-006]] · [[BR-EXEC-007 - Poll do buffer a cada 200ms por message_id incremental|BR-EXEC-007]] · [[BR-EXEC-008 - Roteamento XML x output de documentação com detecção de CDATA|BR-EXEC-008]] · [[BR-EXEC-009 - Separação do XML de cobertura do XML JUnit no mesmo buffer|BR-EXEC-009]] · [[BR-EXEC-010 - Cancelamento dispara conn.break() nas duas conexões|BR-EXEC-010]] · [[BR-EXEC-011 - Timeout opcional reusa o caminho de cancelamento|BR-EXEC-011]] · [[BR-EXEC-012 - Binds tipados - nenhum valor de usuário concatenado no PL-SQL|BR-EXEC-012]] · [[BR-EXEC-013 - Reporter de cobertura só entra se existir no banco|BR-EXEC-013]] · [[BR-EXEC-014 - Reporters adicionais são validados e sanitizados antes do PL-SQL|BR-EXEC-014]]
- 🔗 [[NFR-004 - Latência do streaming]] · [[NFR-005 - Cancelamento e timeout]]
- ↩️ Referenciada por: [[ENT-001 - Run|ENT-001]] · [[Invocation-mode]] · [[Oracle-direct-execution]] · [[PAT-002 - Orquestrador com handlers agrupados por área|PAT-002]] · [[PAT-004 - Streaming por poll incremental de buffer|PAT-004]] · [[PAT-005 - Degradação graciosa (best-effort)|PAT-005]] · [[PAT-006 - Options object para execuções longas|PAT-006]] · [[Tests]]
<!-- brain:auto:end -->
