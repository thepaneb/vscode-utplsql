<!-- GENERATED FROM docs/brain/70-Wiki/Editor-integration.md — DO NOT EDIT -->

# Editor Integration

How the extension surfaces test results inside the editor: CodeLens, inline
decorations, the status bar, smart re-run and jump-to-failure.

## CodeLens

**Run** and **Run with Coverage** buttons appear over every `%suite` and `%test`
in PL/SQL files. They are configurable with `utplsql.codeLens.enabled`.

- Registered by a selector that combines the canonical `**/*.pks` glob, the globs
  derived from `utplsql.discovery.languageIds` (default `plsql`, `sql`,
  `oracle-sql`) and `files.associations`, plus the configured language IDs —
  covering `.pls`, `.plb`, `.tps`, `.tpb`, `.vw` and custom extensions.
- A document matched by both a glob and a language ID yields a **single** set of
  lenses (the provider is registered once, not once per selector).
- `%suite` runs all suites in the file; `%test` runs only that procedure.
- Database-discovered suites (virtual `utplsql-db:/` URIs) have no CodeLens.

## Snippets

`contributes.snippets` registers `snippets/utplsql.code-snippets` for `sql` and
`plsql` (`oracle-sql` remains accepted by discovery/CodeLens; registering
snippets for a language ID no installed extension contributes makes VS Code
emit a warning). Type `ut-` in the editor to get:

- `ut-suite` — full suite package skeleton (`%suite` + `%suitepath` + `%test`);
- `ut-%suite`, `ut-%suitepath`, `ut-%test`, `ut-%context`/`ut-%endcontext`,
  `ut-%name`, `ut-%beforeall`/`ut-%afterall`, `ut-%beforeeach`/`ut-%aftereach`,
  `ut-%beforetest`/`ut-%aftertest`, `ut-%disabled`, `ut-%tags`, `ut-%rollback`,
  `ut-%throws`, `ut-%displayname`;
- `ut-expect-*` for the main matchers (`to_equal`, `to_be_*`, `to_match`,
  `to_be_like`, `to_contain`, `to_have_count`, cursor modifiers, JSON) and
  `ut-fail`;
- `ut-nls-cursor` with `ut.set_nls` → `to_equal` → `ut.reset_nls` (avoids
  `ORA-01861` when comparing `DATE` values).

The JSON is validated by `src/test/unit/snippets.test.ts` in the unit suite.

## Inline decorations

After a run, ✓/✗/⚠ markers appear on the `%suite`/`%test` lines, with the failure
message as a hover and a matching overview-ruler mark. Controlled by
`utplsql.decorations.enabled`. Works in both `file` and `schema` tree modes.

On assertion failures, the Test Explorer item shows VS Code's **native diff** with
the *Expected* and *Actual* values extracted from the reporter message.

## Status bar

The status bar shows an idle indicator, live progress (`Running N/M suites`) and
the final pass/fail count with duration. With an active connection profile,
clicking it switches profiles; the item also carries the **coverage toggle**
(`utPLSQL: Toggle Coverage`, `Ctrl+Shift+U Shift+C`) that switches the session
coverage mode. Controlled by `utplsql.statusBar.enabled`.

## Smart re-run

| Shortcut | Command | Behavior |
|---|---|---|
| `Ctrl+Shift+U L` | Rerun Last | Repeats the last execution (with/without coverage) |
| `Ctrl+Shift+U U` | Run at Cursor | Runs the `%test`/`%suite` under the cursor |
| `Ctrl+Shift+U X` | Run Failed Only | Re-runs only the tests that failed |
| `Ctrl+Shift+U Shift+R` | Run Related Tests | Runs the suites related to the active production file, by the `ut_<object>` convention (PRD-58) |

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
- Works for local workspace files and, when there is no local file, through the
  read-only `utplsql-source:` virtual document resolved from `ALL_SOURCE`.
- Only the first user frame is used; external/Oracle-internal code resolves to no
  location.
- Test results are read from **nested** `<testsuite>` levels too, so suites run
  with `--%suitepath` (or with utPLSQL installed in another schema) are not
  reported as "No JUnit result found".

## Generate test suite (Code Action)

On a production `.pks`/`.pkb` (never on a `ut_*` suite) the editor offers a
**Code Action** — and the palette the command **`utPLSQL: Generate test suite`** —
that writes `ut_<package>.pks` next to the file (or in the first workspace folder
when the source is a database object, prompted as `SCHEMA.OBJECT`). With no
routines to extract it writes the skeleton (`%suite` + one example `%test`);
otherwise it writes one `%test` per procedure/function. An existing file is never
overwritten without confirmation. Options: `utplsql.generate.testPackagePrefix`,
`…testPackageSuffix`, `…numberOfTestsPerUnit` and `…generateComments`.

## Context menu and shortcuts

Execution commands are also available from the right-click context menu on files
and folders. See [Commands](Commands) for the full list and all keybindings.
