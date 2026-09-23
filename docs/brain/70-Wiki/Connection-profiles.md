---
tipo: wiki
status: ativo
titulo: "Connection Profiles"
publicar: docs/wiki/Connection-profiles.md
verificado: 2026-09-23
tags: [wiki]
---

# Connection Profiles

Connection profiles let you save several Oracle environments (DEV/TEST/PROD) and
switch between them without reconfiguring the extension. Each profile can carry
its own `sourcePath`, `coverageOwner`, `includePatterns`, `description` and
`charset`, in addition to the connection string.

> Introduced in PRD-34. Since PRD-65 the password is **not** stored in settings.

## Creating and switching

| Action | How |
|---|---|
| Create | `utPLSQL: New connection profile...` (wizard) |
| Switch | `utPLSQL: Switch connection profile...` or click the status bar |
| Manage | `utPLSQL: Manage connection profiles` (opens `utplsql.profiles`) |
| Import | `utPLSQL: Import connections from SQL Developer` |

The status bar shows the active profile (`$(database) <profile>`), and clicking it
switches profiles.

## Where passwords are stored

The profile's `connection` field stores only `user@//host:port/service` — **no
password**. The password lives in the OS keychain (**VS Code SecretStorage**),
keyed by the profile `id`, and is recombined at connection time.

Profiles saved before this change (with an inline password) are **migrated
automatically on first use**.

## Profile fields (`utplsql.profiles`)

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `id` | string | No (auto) | — | Profile UUID |
| `name` | string | Yes | — | Friendly name (e.g. "DEV Local") |
| `connection` | string | Yes | — | Connection string **without password** |
| `description` | string | No | — | Shown in the picker |
| `charset` | enum | No | `utf8` | Script file encoding: `utf8`, `latin1`, `win1252` |
| `sourcePath` | string | No | inherits global | Overrides `utplsql.sourcePath` |
| `coverageOwner` | string | No | inherits global | Overrides `utplsql.coverageOwner` |
| `includePatterns` | string[] | No | inherits global | Overrides `utplsql.includePatterns` |
| `isDefault` | boolean | No | `false` | Default badge in the picker (does **not** auto-select) |
| `lastUsed` | string | No | — | Reserved — not read/written today |

## Example

```jsonc
{
  "utplsql.activeProfile": "dev",
  "utplsql.profiles": [
    {
      "id": "a1b2c3d4-...",
      "name": "DEV Local",
      "connection": "app@//localhost:1521/XEPDB1",
      "description": "Local development database",
      "charset": "utf8",
      "sourcePath": "src"
    },
    {
      "id": "e5f6g7h8-...",
      "name": "LEGACY Windows",
      "connection": "legacy@//old-db:1521/LEGACY",
      "description": "Legacy Windows-1252 database",
      "charset": "win1252",
      "sourcePath": "legacy/src"
    }
  ]
}
```

## Resolution order

When resolving the connection, the extension tries:

1. **Active profile** (`utplsql.activeProfile` → `profile.connection`) — overrides everything below
2. Setting `utplsql.connection`
3. Environment variable `UTPLSQL_CONN`
4. Session cache
5. Prompt

See [[Connection]] for the full table and security recommendations.
The active profile also overrides `sourcePath`, `coverageOwner`, etc. via
`mergeProfileConfig`.

## SQL Developer import

`utPLSQL: Import connections from SQL Developer` parses the SQL Developer
`connections.xml` under `~/.sqldeveloper` and `%APPDATA%/SQL Developer`
(`system*` subfolders). Passwords found there are moved to SecretStorage.
