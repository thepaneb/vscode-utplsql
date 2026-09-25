---
tipo: wiki
status: ativo
titulo: "Configuration Examples (recipes)"
publicar: docs/wiki/Configuration-examples.md
origem: ["09-configuration"]
verificado: 2026-09-23
tags: [wiki]
---

# Configuration Examples (recipes)

Copy-paste snippets for common scenarios. Every key is prefixed `utplsql.`; for the
full reference see [[Configuration|Settings]].

> **Never store passwords in `settings.json`.** Use the `UTPLSQL_CONN` environment
> variable (or connection profiles) instead — see [[Connection|Connection Setup]].

Recommended precedence: put `sourcePath` and other project-specific values in the
**workspace** `.vscode/settings.json`; keep machine/credential data in **user**
settings or env vars.

## 1. Local dev without passwords (recommended)

```jsonc
// .vscode/settings.json
{
  "utplsql.sourcePath": "src"
}
```

```sh
# provide the connection out-of-band
export UTPLSQL_CONN="app/password@//localhost:1521/XEPDB1"
```

PowerShell: `$env:UTPLSQL_CONN = "app/password@//localhost:1521/XEPDB1"`.

## 2. Multiple environments with profiles

```jsonc
// user settings.json (contains credentials — keep it out of git)
{
  "utplsql.activeProfile": "dev",
  "utplsql.profiles": [
    {
      "id": "11111111-1111-1111-1111-111111111111",
      "name": "DEV Local",
      "connection": "app/password@//localhost:1521/XEPDB1",
      "description": "Local development",
      "charset": "utf8",
      "sourcePath": "src",
      "isDefault": true
    },
    {
      "id": "22222222-2222-2222-2222-222222222222",
      "name": "HOMOLOG",
      "connection": "app/password@//homolog:1521/APP",
      "sourcePath": "src",
      "coverageOwner": "APP"
    }
  ]
}
```

Switch at runtime with the `utplsql.switchProfile` command.

## 3. Legacy database with Windows-1252 files

When `.sql` files are encoded as Windows-1252, set the profile `charset` so
`runScriptFile`/`runScriptFolder` decode them correctly:

```jsonc
{
  "utplsql.profiles": [
    {
      "id": "33333333-3333-3333-3333-333333333333",
      "name": "LEGACY (win1252)",
      "connection": "legacy/password@//old-db:1521/LEGACY",
      "charset": "win1252",
      "sourcePath": "legacy/src"
    }
  ]
}
```

## 4. Tests stored in `.sql` files

```jsonc
{
  "utplsql.includePatterns": ["**/*.sql"]
}
```

## 5. Schema-mode tree (Schema > Package > Suite > Test)

```jsonc
{
  "utplsql.organization": "schema",
  "utplsql.organization.schemaPattern": "db/{schema}/**"
}
```

With a configured connection, refresh also discovers suites from the database for
schemas that have no local files. See [[Tree-organization|Tree Organization]].

## 6. Coverage of a different owner + SQL (view) coverage

```jsonc
{
  "utplsql.sourcePath": "src",
  "utplsql.coverageOwner": "APP",
  "utplsql.sqlCoverageEnabled": true
}
```

`sqlCoverageEnabled` requires `GRANT SELECT ON V$SQL` and is best-effort. See
[[Coverage|Code Coverage]].

## 7. Running SQL scripts (migrations, seeds)

```jsonc
{
  "utplsql.scriptRunner.stopOnError": true,
  "utplsql.scriptRunner.autoCommit": true,
  "utplsql.scriptRunner.filePattern": "**/*.{sql,pks,pkb,fnc,prc,trg}",
  "utplsql.scriptRunner.dbmsOutput": false,
  "utplsql.scriptRunner.timeoutSeconds": 300
}
```

Loaded from the editor (`utplsql.runScript`) or by file/folder in the Explorer.
See [[Commands]].

## 8. Long-running suites + debug output

```jsonc
{
  "utplsql.timeoutMinutes": 120,
  "utplsql.dbmsOutput": true
}
```

`timeoutMinutes` cancels the run on expiry (`0`/unset semantics: default `60`);
`dbmsOutput` appends `DBMS_OUTPUT` captured from the test session to the run output.

## 9. Quiet workspace (less UI noise)

Useful for screenshots or when you only care about the Test Explorer:

```jsonc
{
  "utplsql.codeLens.enabled": false,
  "utplsql.decorations.enabled": false,
  "utplsql.statusBar.enabled": false
}
```

## 10. Pool tuning for heavy runs

```jsonc
{
  "utplsql.oraclePoolMin": 2,
  "utplsql.oraclePoolMax": 20,
  "utplsql.oraclePoolIncrement": 2,
  "utplsql.oraclePoolPingInterval": 60
}
```

See [[Oracle-direct-execution|Direct Oracle Execution]].

## 11. Extra reporters (e.g. HTML coverage)

```jsonc
{
  "utplsql.additionalReporters": ["UT_COVERAGE_HTML_REPORTER"]
}
```

## 12. Force the extension UI language

```jsonc
{
  "utplsql.language": "pt-br"
}
```

`auto` (default) follows the VSCode language. See [[Configuration|Settings]] for the
full list of locales.

## 13. Multi-root workspace (per-folder settings)

In a `.code-workspace` file, scope settings to a folder:

```jsonc
{
  "folders": [{ "path": "project-a" }, { "path": "project-b" }],
  "settings": {
    "[project-a]": {
      "utplsql.sourcePath": "project-a/src",
      "utplsql.organization": "schema",
      "utplsql.organization.schemaPattern": "project-a/db/{schema}/**"
    },
    "[project-b]": {
      "utplsql.sourcePath": "project-b/src"
    }
  }
}
```

## See also

- [[Configuration|Settings]] — full reference and precedence
- [[Connection|Connection Setup]]
- [[Coverage|Code Coverage]]
- [[Tree-organization|Tree Organization]]
- [[Reporters|Custom Reporters]]
- [[Commands]]
