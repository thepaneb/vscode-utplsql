# Test Explorer

The extension registers a native VSCode **Test Explorer** (`utplsql`) — suites and
tests appear in the **Testing** view (flask icon in the sidebar) and use all the
standard test UI: run profiles, status icons, per-test output and coverage.

## Registering and refreshing

The controller is created as:

```typescript
const controller = vscode.tests.createTestController('utplsql', 'utPLSQL');
```

- `resolveHandler` — runs the first refresh when the view is opened
- `refreshHandler` — the **Refresh** action in the toolbar
- File watcher on `.pks`/`.pkb` with a debounce
  (`utplsql.refreshDebounceMs`) triggers automatic rediscovery
- `utPLSQL: Refresh tests` (`utplsql.refresh`) forces a rediscovery

Discovery reads `%suite`/`%test` from `.pks` files and, in `schema` mode, also
from the database. See [Tree Organization](Tree-organization).

## Trees

| Organization | Structure |
|---|---|
| `file` (default) | Workspace Folder > `.pks` file > Suite > Test |
| `schema` | Schema > Package > Suite > Test |

Suites and tests have stable ids (`suite:<pkg>`, `test:<pkg>.<proc>`), which keeps
results consistent across both modes. Set `utplsql.organization` to switch.

## Run profiles

Two profiles are created on the controller and are both **default** (shown in the
Test Explorer toolbar and the editor gutter):

| Profile | Kind | Action |
|---|---|---|
| **Run** | `TestRunProfileKind.Run` | Runs the selected items without coverage |
| **Run with Coverage** | `TestRunProfileKind.Coverage` | Runs with the Cobertura profile and reports coverage |

`Run with Coverage` also implements `loadDetailedCoverage`, reading back the
per-line details stored for each file (`state.getCoverage`), so the editor can
show the green/red gutters when you open a covered file.

## Running tests

Any of these produce a `TestRunRequest` against the controller:

- **Testing view toolbar** — Run Tests / Run with Coverage (or a specific
  profile from the dropdown)
- **Gutter** — ▶ next to a test/suite in the editor
- **CodeLens** — Run / Run with Coverage over `%suite`/`%test`
- **Right-click** on a file or folder → *utPLSQL: Run tests…*
- **Palette / shortcuts** — `utPLSQL: Run all tests`, Rerun Last, Run at Cursor,
  Run Failed Only

See [Quick start](Quick-start) and [Commands](Commands) for the full list.

## Result status

Each item is marked as **passed**, **failed**, **errored** or **skipped**, and the
utPLSQL documentation output streams to the test output in real time.

- Failure/error messages include the utPLSQL assertion message.
- Failures carry a `TestMessage.location`, enabling the native **Go to Error**
  action (jump to the failing assertion). See [Editor Integration](Editor-integration).
- The status bar summarises pass/fail count and total duration.

## Annotations that affect the tree

| Annotation | Effect |
|---|---|
| `-- %disabled` | Suite/test is hidden from the tree |
| `-- %displayname(Name)` | Label shown instead of the `%test` description |
| `-- %tags(...)` | Tags are attached to the test; filter execution with the `utplsql.tags` setting (e.g. `fast & !integration`) |
| `-- %throws(...)`, `-- %before*` | Metadata only (no visual change yet) |

## Database-discovered suites

In `schema` mode, suites found only in the database (not in the workspace) use a
virtual URI `utplsql-db:/SCHEMA/PKG.pks`. They can be **executed**, but have no
CodeLens, decorations or jump-to-failure (those providers require real files).

## Related

- [Tree Organization](Tree-organization) — how the tree is built and schema extraction
- [Editor Integration](Editor-integration) — CodeLens, decorations, status bar, jump-to-failure
- [Coverage](Coverage) — coverage model and mapping
- [Commands](Commands) — commands and keybindings
