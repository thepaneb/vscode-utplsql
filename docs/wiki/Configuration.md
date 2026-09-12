# Configuration (settings)

All extension settings, prefixed with `utplsql.`. Configure them in the
user or workspace `settings.json` (`.vscode/settings.json`).

## Connection

| Setting | Default | Description |
|---|---|---|
| `utplsql.connection` | `""` | Oracle connection. Leave empty and use `UTPLSQL_CONN` to avoid storing passwords. |
| `utplsql.profiles` | `[]` | Saved connection profiles (see field table below). |
| `utplsql.activeProfile` | `""` | Active connection profile. Empty = uses `connection`/`UTPLSQL_CONN`. |

### Profile fields (`utplsql.profiles`)

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `id` | string | Yes (auto-generated) | — | Profile UUID. |
| `name` | string | Yes | — | Friendly name (e.g. "DEV Local"). |
| `connection` | string | Yes | — | Connection string (`user/pass@//host:port/service`). |
| `description` | string | No | — | Description shown in the connection picker. |
| `charset` | enum | No | `utf8` | Encoding used to read script files: `utf8`, `latin1` or `win1252`. |
| `sourcePath` | string | No | inherits global | Overrides `utplsql.sourcePath`. |
| `coverageOwner` | string | No | inherits global | Overrides `utplsql.coverageOwner`. |
| `includePatterns` | string[] | No | inherits global | Overrides `utplsql.includePatterns`. |
| `isDefault` | boolean | No | `false` | Marks the profile as default when loading the workspace. |
| `lastUsed` | string | No | — | ISO timestamp of last use. |

Example:

```jsonc
// .vscode/settings.json or user settings
{
  "utplsql.activeProfile": "dev",
  "utplsql.profiles": [
    {
      "id": "a1b2c3d4-...",
      "name": "DEV Local",
      "connection": "app/password@//localhost:1521/XEPDB1",
      "description": "Local development database",
      "charset": "utf8",
      "sourcePath": "src"
    },
    {
      "id": "e5f6g7h8-...",
      "name": "LEGACY Windows",
      "connection": "legacy/password@//old-db:1521/LEGACY",
      "description": "Legacy Windows-1252 database",
      "charset": "win1252",
      "sourcePath": "legacy/src"
    }
  ]
}
```

## Running SQL scripts

Runs arbitrary SQL/PL/SQL scripts (migrations, seeds, setup) against a
connection profile chosen in a QuickPick after invocation — from the editor
(`utplsql.runScript`), by file (`utplsql.runScriptFile`) or by folder
(`utplsql.runScriptFolder`) in the Explorer. Output goes to the "utPLSQL
Script" OutputChannel, one line per statement. See [Commands](Commands).

| Setting | Default | Description |
|---|---|---|
| `utplsql.scriptRunner.stopOnError` | `true` | Stops on the first failure (`false` = keeps logging the rest). |
| `utplsql.scriptRunner.autoCommit` | `true` | `autoCommit` on each statement. |
| `utplsql.scriptRunner.filePattern` | `**/*.{sql,pks,pkb,fnc,prc,trg}` | Globs to list files when running a folder. |
| `utplsql.scriptRunner.dbmsOutput` | `false` | Captures and displays `DBMS_OUTPUT` during execution. |
| `utplsql.scriptRunner.timeoutSeconds` | `300` | Per-statement timeout in seconds (`callTimeout`). |

The profile `charset` applies to `runScriptFile`/`runScriptFolder` (files are
read as bytes and decoded). For `runScript` (editor) the text already comes
decoded by VSCode — the profile charset does not apply.

## Coverage

| Setting | Default | Description |
|---|---|---|
| `utplsql.sourcePath` | `install` | Production code folder to map coverage. |
| `utplsql.coverageOwner` | `""` | Schema of covered objects. Empty = connection user. |
| `utplsql.sqlCoverageEnabled` | `false` | Tracks views (SQL objects) via `V$SQL` after the run, marking them as executed/not executed. Requires `GRANT SELECT ON V$SQL`. Best-effort. |

## PL/SQL Debug

| Setting | Default | Description |
|---|---|---|
| `utplsql.debugger.enabled` | `true` | Enables PL/SQL test debugging via DBMS_DEBUG (Debug Adapter `utplsql`). |
| `utplsql.debugger.stopOnException` | `true` | Pauses execution when an unhandled exception is raised. |
| `utplsql.debugger.timeoutSeconds` | `300` | Debug session timeout in seconds. |

## Test Discovery

| Setting | Default | Description |
|---|---|---|
| `utplsql.includePatterns` | `["**/*.pks"]` | Globs to discover specs. Use `["**/*.sql"]` if your tests are in `.sql` files. |

## Oracle Runner Pool

| Setting | Default | Description |
|---|---|---|
| `utplsql.oraclePoolMin` | `2` | Minimum connections kept in the pool (node-oracledb). |
| `utplsql.oraclePoolMax` | `10` | Maximum connections in the pool. |
| `utplsql.oraclePoolIncrement` | `1` | Increment when expanding the pool. |
| `utplsql.oraclePoolPingInterval` | `60` | Seconds between health checks for idle pool connections. `0` = ping on every checkout. |

The pool is created **lazily** on the first Oracle execution, recreated when the
connection changes, and closed when the extension is deactivated. See [Direct Oracle Execution](Oracle-direct-execution).

## Reporters

| Setting | Default | Description |
|---|---|---|
| `utplsql.additionalReporters` | `[]` | Extra reporters included in every execution. See [Reporters](Reporters). |

## UI (CodeLens, Status Bar, Decorations)

| Setting | Default | Description |
|---|---|---|
| `utplsql.codeLens.enabled` | `true` | CodeLens Run/Run with Coverage buttons above `%suite` and `%test`. |
| `utplsql.statusBar.enabled` | `true` | Status indicator in the status bar (pass/fail + duration). |
| `utplsql.decorations.enabled` | `true` | Inline ✓/✗/⚠ icons in the editor after execution. |
| `utplsql.compilationDiagnostics.enabled` | `true` | Displays PL/SQL compilation errors as underlines and in the Problems Panel. |
| `utplsql.setupDiagnostics.enabled` | `true` | Displays setup diagnostics (connection, grants, version) and utPLSQL installation integrity diagnostics (invalid objects, "Recompile UT3" quick-fix) with quick-fix. |

## Tree Organization

| Setting | Default | Description |
|---|---|---|
| `utplsql.organization` | `file` | `file` (by path) or `schema` (Schema > Package > Suite > Test). |
| `utplsql.organization.schemaPattern` | `db/{schema}/**` | Glob pattern to extract schema from the path. Use `{schema}` as a placeholder. |

In `schema` mode with a configured connection (no prompt), the refresh also
discovers suites directly from the database (`ALL_OBJECTS`/`ALL_SOURCE`) for schemas whose
files are not in the workspace — the queried schemas are the directories
below the pattern root (e.g., `db/*`) and the schemas of local suites.
See [Tree Organization](Tree-organization).

## Language (i18n)

| Setting | Default | Description |
|---|---|---|
| `utplsql.language` | `auto` | Extension UI language. `auto` follows the VSCode language. Values: `auto`, `pt-br`, `en`, `en-gb`, `es`, `zh-cn`, `zh-tw`, `ja`, `de`, `fr`, `it`, `ko`, `ru`, `tr`, `pl`, `cs`, `hu`, `bg`, `el`, `id`, `ro`, `sr`, `th`, `uk`, `vi`. |

## Settings Hierarchy

VSCode applies settings in this order (the last one wins):

1. **Default** — extension default value
2. **User** — `%APPDATA%/Code/User/settings.json`
3. **Workspace** — project's `.vscode/settings.json`
4. **Workspace Folder** — for multi-root workspaces

Recommendation: put `sourcePath` in **workspace** (varies per project).
Keep `connection` **out** of settings.json (use env var).

## Full Example

```jsonc
// .vscode/settings.json
{
  // Coverage (project-specific)
  "utplsql.sourcePath": "install",

  // Connection: do NOT put it here — use env var UTPLSQL_CONN
  // "utplsql.connection": "DEV/password@//host:1521/XEPDB1"  ← AVOID

  // Extra reporters (optional)
  "utplsql.additionalReporters": ["UT_COVERAGE_HTML_REPORTER"]
}
```
