---
tipo: wiki
status: ativo
titulo: "Performance and tracing"
publicar: docs/wiki/Performance.md
origem: ["09-configuration"]
verificado: 2026-11-05
regras: ["BR-LOG-002"]
tags: [wiki, performance]
---

# Performance and tracing

<!-- prd:PRD-102 -->

The extension keeps tracing and performance measurement **opt-in**. Both are
off by default and have negligible overhead when disabled.

## Trace

`utplsql.trace` (boolean, default `false`) emits verbose per-event lines in the
**utPLSQL** output channel: the run targets, generated SQL and per-event test
information. Use it only while diagnosing a problem; it is intentionally not
enabled by `UTPLSQL_DEBUG=1`.

## Performance phases

`utplsql.perf.enabled` (boolean, default `false`) measures five phases:

| Phase | What it covers |
|---|---|
| `discovery` | workspace/DB discovery of suites |
| `buildTree` | Test Explorer tree construction |
| `run` | `ut_runner.run` (blocking) |
| `poll` | 200 ms buffer polling (documentation/JUnit/Cobertura/HTML) |
| `parseXml` | JUnit/Cobertura parsing and result/coverage application |

When `utplsql.perf.reportFile` is set, each measurement is appended as **one
JSON line** to that file (absolute, or relative to the first workspace folder).
The file is created on demand; `test-results/perf-report.jsonl` is
git-ignored and used by the performance harness.

## Safety

Tracing and performance samples never include passwords or unmasked connection
strings (`SEC-002`, `BR-CONN-020`). A write failure in the report file becomes a
warning and never interrupts a test run.
