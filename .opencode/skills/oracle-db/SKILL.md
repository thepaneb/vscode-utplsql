---
name: oracle-db
description: Oracle Database guidance for SQL, PL/SQL, node-oracledb, utPLSQL testing, schema discovery, connection pooling, and agent-safe database workflows. Use when working with Oracle DB in this VSCode extension project.
compatibility: opencode
---

# Oracle Database — Domain Router

This skill routes to Oracle best practices installed from the official `oracle/skills` repository. 
For detailed guidance on specific topics, reference the following sub-skills:

## Sub-skills available in this project

- **oracle-utplsql**: Database testing with utPLSQL — test structure, assertions, mocking, CI/CD
- **oracle-nodejs**: node-oracledb best practices — connection pooling, binds, streaming, PL/SQL calls
- **oracle-schema-discovery**: Schema introspection queries — ALL_OBJECTS, ALL_SYNONYMS, invalid objects

## Project-specific conventions

This project is a VSCode extension for utPLSQL testing. Key patterns:

1. Two runner modes coexist: CLI (utPLSQL-cli + Java) and Oracle direct (node-oracledb)
2. `runnerMode: auto` defaults to Oracle → fallback CLI
3. Oracle direct mode uses `UT_OUTPUT_BUFFER_TMP` for polling real-time output
4. Schema discovery queries `ALL_SYNONYMS` to find UT3 schema prefix for shared installs
5. Connection is resolved via: setting → env `UTPLSQL_CONN` → session cache → prompt
6. Never log connection strings in plaintext

## When to load other skills

| Task | Load |
|------|------|
| Writing/modifying PL/SQL tests | oracle-utplsql |
| Working with node-oracledb | oracle-nodejs |
| Introspecting schema | oracle-schema-discovery |
| TDD workflow | tdd |
| Debugging failures | debugging |
