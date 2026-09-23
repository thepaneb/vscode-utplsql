---
tipo: wiki
status: ativo
titulo: "Running SQL Scripts"
publicar: docs/wiki/SQL-scripts.md
verificado: 2026-09-23
tags: [wiki]
---

# Running SQL Scripts

Run arbitrary SQL/PL/SQL scripts (migrations, seeds, setup) against an Oracle
connection profile — without leaving VSCode. Output goes to the **"utPLSQL
Script"** Output channel, one line per statement.

> Introduced in PRD-62.

## Commands

| Command | What it runs |
|---|---|
| `utPLSQL: Run script` (`utplsql.runScript`) | The script open in the editor |
| `utPLSQL: Run script file` (`utplsql.runScriptFile`) | An Explorer script file (decoded with the profile `charset`) |
| `utPLSQL: Run script folder` (`utplsql.runScriptFolder`) | Every matching file in a folder, in alphabetical order |

All three ask for a connection **profile** in a QuickPick after invocation. The
right-click context menu exposes them on `.sql`/`.pks`/`.pkb`/`.fnc`/`.prc`/`.trg`
files and folders.

## Statement splitting

- **PL/SQL blocks** (`BEGIN`/`DECLARE`/`CREATE … FUNCTION, PROCEDURE, PACKAGE,
  TRIGGER, TYPE`) are terminated by `/` on its own line.
- **Other statements** are terminated by `;`.
- Comments and string literals never break the split.
- Setup is lazy at the first `;`/`/`, so a header may span several lines.

The trailing `;` (client terminator) is stripped from SQL statements before
sending: Oracle 19c/21c reject it (`ORA-00933`/`ORA-00922`), even though 23ai
tolerates it. PL/SQL blocks keep the `;` of `END;`.

SQL*Plus client directives at the start of a statement (`PROMPT`, `SHOW ERRORS`,
`SET`, `SPOOL`, `@file`, …) are ignored. `SET` is only skipped when it starts a
statement, so `UPDATE … SET …` keeps working.

## Charset

The profile `charset` (`utf8`, `latin1`, `win1252`) applies to
`runScriptFile`/`runScriptFolder` — files are read as bytes and decoded.
For `runScript` (editor) the text is already decoded by VSCode, so the charset
does not apply.

## Settings

| Setting | Default | Description |
|---|---|---|
| `utplsql.scriptRunner.stopOnError` | `true` | Stop on the first failure (`false` = keep logging the rest) |
| `utplsql.scriptRunner.autoCommit` | `true` | `autoCommit` on each statement |
| `utplsql.scriptRunner.filePattern` | `**/*.{sql,pks,pkb,fnc,prc,trg}` | Globs to list files when running a folder |
| `utplsql.scriptRunner.dbmsOutput` | `false` | Capture and display `DBMS_OUTPUT` |
| `utplsql.scriptRunner.timeoutSeconds` | `300` | Per-statement timeout (`callTimeout`) |

## Output

Each statement is logged as:

```
[N] (ok|erro) <ms> — <summary>
```

Cancellation is supported (the current statement is interrupted via
`conn.break()`), and the connection password is always masked in logs/output.
