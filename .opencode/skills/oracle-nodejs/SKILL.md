---
name: oracle-nodejs
description: node-oracledb best practices — connection pooling, bind variables, PL/SQL calls, streaming, LOB handling. Use when working with oracleRunner.ts or any node-oracledb code in this project.
compatibility: opencode
---

# node-oracledb Best Practices

## Connection Pooling (CRITICAL)

**Always use connection pooling for applications, not raw connections.**

```js
// Create pool ONCE at extension activation
await oracledb.createPool({
  user:          'hr',
  password:      'password',
  connectString: 'localhost:1521/freepdb1',
  poolMin:       2,
  poolMax:       10,
  poolIncrement: 1,
  poolPingInterval: 60,   // validate borrowed connections every 60s
  stmtCacheSize: 30,
});

// Borrow from pool per test run
conn = await oracledb.getConnection();

// ALWAYS return to pool in finally
finally {
  if (conn) await conn.close();  // returns to pool, does NOT close
}

// Close pool at extension deactivation
await oracledb.getPool().close(10);
```

## Current project gaps (oracleRunner.ts)

1. **No pool**: Creates 2 raw `getConnection()` calls per run — should use `createPool` at activation
2. **No connection validation**: Should set `poolPingInterval`
3. **No outFormat**: Should set `oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT`
4. **No statement caching**: Should set `stmtCacheSize`

## Bind Variables

Always use binds — never template literals with user data in SQL:
```js
// CORRECT
await conn.execute('SELECT * FROM emp WHERE id = :id', { id: 100 });

// WRONG — SQL injection
await conn.execute(`SELECT * FROM emp WHERE id = ${id}`);
```

## PL/SQL Calls

```js
await conn.execute(
  `BEGIN my_pkg.my_proc(:p1, :p2); END;`,
  {
    p1: { val: 100, dir: oracledb.BIND_IN,  type: oracledb.NUMBER },
    p2: { val: '',  dir: oracledb.BIND_OUT, type: oracledb.STRING, maxSize: 100 },
  }
);
```

## Thin vs Thick Mode

- **Thin mode** (default): Pure JavaScript, no Oracle Client. Used by this project.
- **Thick mode**: Requires Instant Client. Needed only for AQ, Sharding, proxy auth.

## Pool Sizing (Little's Law)

```
Optimal Pool Size ≈ Throughput × Average Query Duration
```

Start small: 2-10 connections. More connections = more DB context switching.

## See Also

- oracle-schema-discovery: Schema introspection queries
- oracle-utplsql: utPLSQL test runner integration
