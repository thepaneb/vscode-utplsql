# Oracle Direct Execution (Streaming)

The extension runs tests directly on the Oracle database via
[node-oracledb](https://node-oracle.readthedocs.io/), with results in
**real time** — each test appears in the Test Explorer as soon as it finishes,
without waiting for the entire batch.

## How It Works

![Real-time streaming diagram](images/diagram-streaming.png)

1. The extension opens **two Oracle connections** via `node-oracledb` (thin driver, no Instant Client).
2. **conn1** executes `ut_runner.run(a_paths => ..., a_reporters => ...)` — blocking.
3. **conn2** polls the `UT_OUTPUT_BUFFER_TMP` table every 200ms.
4. Documentation lines (text) are displayed in real time in the Output.
5. XML lines (JUnit) are accumulated and parsed at the end with `parseJUnit()`.
6. Coverage is extracted from the same buffer (tag `<coverage` in the XML).

**Advantages:**
- Instant feedback — each test appears in the Explorer as soon as it finishes
- Cancellation interrupts the running statement (`conn.break()` on both
  connections + `Promise.race`)
- No temporary files (`results.xml`, `coverage.xml`)
- Results are preserved even if the process fails midway

## Prerequisites

### node-oracledb

The VSIX already includes `oracledb` **thin** (pure JavaScript, no Oracle Instant
Client — the native binaries of the thick driver are pruned during packaging).

### Connection Pooling (v0.10.0)

Oracle runner connections come from a **managed pool** (no more raw connections
per execution):

- Pool is created **lazily** on the first execution; reused on subsequent ones
- **Automatically recreated** if the connection changes (setting edited or
  `utPLSQL: Clear Connection` + new connection)
- Health check for idle connections via `poolPingInterval` (internal ping from
  the Thin driver — no extra `SELECT 1 FROM DUAL`)
- Closed on `deactivate()` with a 10s drain
- Configurable size: `utplsql.oraclePoolMin/Max/Increment/PingInterval`

If the pool cannot be created (e.g., unreachable database), the runner falls back
to a raw connection.

### Database Grants (Shared Install)

If utPLSQL is installed in a separate schema (e.g., `UT3`), the DBA must
grant access to the buffer tables used by the polling:

```sql
-- As DBA (or UT3 owner):
GRANT SELECT, DELETE ON UT3.UT_OUTPUT_BUFFER_TMP TO PUBLIC;
GRANT SELECT, DELETE ON UT3.UT_OUTPUT_BUFFER_INFO_TMP TO PUBLIC;
```

Without these grants, execution fails with `ORA-00942`.

> In **schema-level** installs (utPLSQL in the same schema as the tests), these
> grants are not needed — the tables are in the same schema.

### Coverage

Coverage requires `GRANT EXECUTE ON SYS.DBMS_PROFILER` on the test schema.

## Troubleshooting

| Symptom | Solution |
|---|---|
| `ORA-00942: table does not exist` | Run the grants on the buffer tables (see above) |
| Connection refused | Check format: `user/pass@//host:port/service` |
| Coverage not working | `GRANT EXECUTE ON DBMS_PROFILER` on the test schema |
