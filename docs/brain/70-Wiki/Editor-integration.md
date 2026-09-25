---
tipo: wiki
status: ativo
titulo: "Editor Integration"
publicar: docs/wiki/Editor-integration.md
verificado: 2026-09-25
tags: [wiki]
---

# Editor Integration

How the extension surfaces test results inside the editor: CodeLens, inline
decorations, the status bar, smart re-run and jump-to-failure.

## CodeLens

**Run** and **Run with Coverage** buttons appear over every `%suite` and `%test`
in `.pks` files. They are configurable with `utplsql.codeLens.enabled`.

- Registered for `{ scheme: 'file', pattern: '**/*.pks' }` — **not** tied to a
  `plsql` language id, so it also works when `.pks` has no language association.
- `%suite` runs all suites in the file; `%test` runs only that procedure.
- Database-discovered suites (virtual `utplsql-db:/` URIs) have no CodeLens.

## Inline decorations

After a run, ✓/✗/⚠ markers appear on the `%suite`/`%test` lines, with the failure
message as a hover and a matching overview-ruler mark. Controlled by
`utplsql.decorations.enabled`. Works in both `file` and `schema` tree modes.

## Status bar

The status bar shows an idle indicator, live progress (`Running N/M suites`) and
the final pass/fail count with duration. With an active connection profile,
clicking it switches profiles. Controlled by `utplsql.statusBar.enabled`.

## Smart re-run

| Shortcut | Command | Behavior |
|---|---|---|
| `Ctrl+Shift+U L` | Rerun Last | Repeats the last execution (with/without coverage) |
| `Ctrl+Shift+U U` | Run at Cursor | Runs the `%test`/`%suite` under the cursor |
| `Ctrl+Shift+U X` | Run Failed Only | Re-runs only the tests that failed |

## Jump to failure

Failures include a native **"Go to Error"** action that jumps to the exact line
of the failing assertion. The extension parses the utPLSQL stack trace from the
JUnit `<failure>`/`<error>` body, filters framework frames and sets
`TestMessage.location`.

- Accepts the three stack formats: `at "SCHEMA.PKG"."PROC", line N` (DBMS
  backtrace), `at "SCHEMA.PKG.PROC", line N` (the one the utPLSQL reporter really
  emits) and `at PKG.PROC, line N` (unquoted).
- Framework frames are filtered **per object segment** (`UT_*`, `UT$*`, `UT3_*`,
  `UT3$*`); the install schema prefix is not a reason to drop a frame, so tests
  living in the install schema (`UT3.MY_TESTS.P`) still resolve.
- The package is taken from the frame (1 segment = itself, 2 = last, 3+ =
  second-to-last) and matched against the discovered suite, falling back to
  `<package>.pks` in the workspace roots.
- Works for code versioned locally (`.pks`/`.pkb` in the workspace).
- Only the first user frame is used; external/Oracle-internal code resolves to no
  location.
- Test results are read from **nested** `<testsuite>` levels too, so suites run
  with `--%suitepath` (or with utPLSQL installed in another schema) are not
  reported as "No JUnit result found".

## Context menu and shortcuts

Execution commands are also available from the right-click context menu on files
and folders. See [[Commands]] for the full list and all keybindings.
