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
JUnit `<failure>`/`<error>` body, filters internal frames (`UT_*`, `UT$`,
`UT3_*`, `UT3$`, `UT3.`) and sets `TestMessage.location`.

- Works for code versioned locally (`.pks`/`.pkb` in the workspace).
- Only the first user frame is used; external/Oracle-internal code resolves to no
  location.

## Context menu and shortcuts

Execution commands are also available from the right-click context menu on files
and folders. See [Commands](Commands) for the full list and all keybindings.
