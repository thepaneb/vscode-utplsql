---
tipo: nota
status: ativo
titulo: "Referência — descrições de comandos"
verificado: 2026-10-29
tags: [docs, comandos]
---

# Referência — descrições de comandos

Fonte das descrições curtas usadas pelo gerador de tabelas do `brain:sync`
(PRD-98). Edite **este arquivo** para ajustar a prosa; os IDs, defaults e títulos
continuam vindo do `package.json`/`package.nls.json`.

```json
{
  "utplsql.runAll": {
    "title": "utPLSQL: Run all tests",
    "description": "Runs all suites in the workspace",
    "shortcut": "▶ button in Testing view"
  },
  "utplsql.runFile": {
    "title": "utPLSQL: Run tests in this file",
    "description": "Runs suites from the active `.pks`/`.pkb`",
    "shortcut": "Right-click → file"
  },
  "utplsql.runFileCoverage": {
    "title": "utPLSQL: Run tests in this file (with coverage)",
    "description": "Same, with coverage profile",
    "shortcut": "Right-click → file"
  },
  "utplsql.runFolder": {
    "title": "utPLSQL: Run tests in this folder",
    "description": "Runs suites from the selected folder",
    "shortcut": "Right-click → folder"
  },
  "utplsql.runFolderCoverage": {
    "title": "utPLSQL: Run tests in this folder (with coverage)",
    "description": "Same, with coverage profile",
    "shortcut": "Right-click → folder"
  },
  "utplsql.refresh": {
    "title": "utPLSQL: Refresh tests",
    "description": "Forces rediscovery of `.pks` files",
    "shortcut": "—"
  },
  "utplsql.cancelRun": {
    "title": "utPLSQL: Cancel run",
    "description": "Stops the current execution",
    "shortcut": "`Escape`"
  },
  "utplsql.showInfo": {
    "title": "utPLSQL: Show utPLSQL info",
    "description": "API/DB versions",
    "shortcut": "—"
  },
  "utplsql.selectReporter": {
    "title": "utPLSQL: Select additional reporter...",
    "description": "QuickPick with database reporters",
    "shortcut": "—"
  },
  "utplsql.clearConnection": {
    "title": "utPLSQL: Clear session connection",
    "description": "Removes connection from cache",
    "shortcut": "—"
  },
  "utplsql.rerunLast": {
    "title": "utPLSQL: Rerun Last",
    "description": "Repeats the last run",
    "shortcut": "`Ctrl+Shift+U L`"
  },
  "utplsql.runAtCursor": {
    "title": "utPLSQL: Run Test at Cursor",
    "description": "Runs the test under the cursor",
    "shortcut": "`Ctrl+Shift+U U`"
  },
  "utplsql.runFailed": {
    "title": "utPLSQL: Run Failed Tests",
    "description": "Re-runs only failed tests",
    "shortcut": "`Ctrl+Shift+U X`"
  },
  "utplsql.toggleCoverage": {
    "title": "utPLSQL: Toggle Coverage",
    "description": "Toggles the session coverage mode used by run commands without explicit coverage",
    "shortcut": "Click on the status bar item"
  },
  "utplsql.runByTag": {
    "title": "utPLSQL: Run Tests by Tag...",
    "description": "Multi-select QuickPick of discovered `%tags`; a `!tag` entry excludes it",
    "shortcut": "—"
  },
  "utplsql.showTestExplorer": {
    "title": "utPLSQL: Show Test Explorer",
    "description": "Focuses the Testing view",
    "shortcut": "—"
  },
  "utplsql.validateSetup": {
    "title": "utPLSQL: Validate setup",
    "description": "Runs full setup validation (including UT3 installation integrity)",
    "shortcut": "—"
  },
  "utplsql.configureConnection": {
    "title": "utPLSQL: Configure connection",
    "description": "Opens settings at `utplsql.connection`",
    "shortcut": "—"
  },
  "utplsql.switchProfile": {
    "title": "utPLSQL: Switch connection profile...",
    "description": "QuickPick to switch the active connection profile",
    "shortcut": "Click on status bar"
  },
  "utplsql.newProfile": {
    "title": "utPLSQL: New connection profile...",
    "description": "Creates a new connection profile",
    "shortcut": "—"
  },
  "utplsql.manageProfiles": {
    "title": "utPLSQL: Manage connection profiles",
    "description": "Opens saved connection profiles",
    "shortcut": "—"
  },
  "utplsql.setWalletPassword": {
    "title": "utPLSQL: Set wallet password",
    "description": "Sets or clears the active profile's Oracle Cloud wallet password (stored in SecretStorage)",
    "shortcut": "—"
  },
  "utplsql.runWithReporter": {
    "title": "utPLSQL: Run with Reporter (Export)",
    "description": "Runs the selection with a chosen database reporter and writes the output to a dedicated Output channel or a file (`utplsql.reporter.*` settings)",
    "shortcut": "Test Explorer item context menu"
  },
  "utplsql.debugTest": {
    "title": "utPLSQL: Debug test (PL/SQL)",
    "description": "Starts debugging a test via DBMS_DEBUG (`utplsql` Debug Adapter)",
    "shortcut": "Editor context menu (`.pks`/`.pkb`)"
  },
  "utplsql.debugAtCursor": {
    "title": "utPLSQL: Debug Test at Cursor",
    "description": "Starts a debug session of the `%test`/`%suite` under the cursor",
    "shortcut": "—"
  },
  "utplsql.debugFailed": {
    "title": "utPLSQL: Debug Failed Tests",
    "description": "Starts a debug session of the tests that failed in the last run (QuickPick when several)",
    "shortcut": "—"
  },
  "utplsql.debugLast": {
    "title": "utPLSQL: Debug Last Run",
    "description": "Starts a debug session of the last run",
    "shortcut": "—"
  },
  "utplsql.compileForDebug": {
    "title": "utPLSQL: Compile for Debug",
    "description": "Compiles the selected file/folder object with debug information (`ALTER … COMPILE DEBUG PLSQL_OPTIMIZE_LEVEL = 1`)",
    "shortcut": "Editor/Explorer context menu"
  },
  "utplsql.rebuildAnnotations": {
    "title": "utPLSQL: Rebuild Annotation Cache",
    "description": "Rebuilds the utPLSQL annotation cache in the database (`ut_runner.rebuild_annotation_cache`) and refreshes the tree",
    "shortcut": "—"
  },
  "utplsql.runScript": {
    "title": "utPLSQL: Run script",
    "description": "Runs the script open in the editor against a profile (connection QuickPick)",
    "shortcut": "Right-click → `.sql`/`.pks`/`.pkb`/`.fnc`/`.prc`/`.trg` file"
  },
  "utplsql.runScriptFile": {
    "title": "utPLSQL: Run script file",
    "description": "Runs an Explorer script file (decoded with the profile `charset`)",
    "shortcut": "Right-click → file"
  },
  "utplsql.runScriptFolder": {
    "title": "utPLSQL: Run script folder",
    "description": "Runs the folder scripts in alphabetical order (`utplsql.scriptRunner.filePattern` filter)",
    "shortcut": "Right-click → folder"
  },
  "utplsql.copyGrantsToClipboard": {
    "title": "utPLSQL: Copy coverage grants to clipboard",
    "description": "Copies SQL grants to clipboard",
    "shortcut": "—"
  },
  "utplsql.runRelated": {
    "title": "utPLSQL: Run Related Tests",
    "description": "Runs the suites related to the active production file, by the `ut_<object>` naming convention",
    "shortcut": "Right-click → file"
  },
  "utplsql.runLens": {
    "title": "Run test (CodeLens)",
    "description": "Internal — triggered by CodeLens buttons",
    "shortcut": "▶ button over `%suite`/`%test`"
  },
  "utplsql.importSqlDevConnections": {
    "title": "Import connections from SQL Developer",
    "description": "Imports SQL Developer connections as profiles",
    "shortcut": "—"
  },
  "utplsql.generateTestSuite": {
    "title": "Generate test suite",
    "description": "Generates `ut_<package>.pks` from a `.pks`/`.pkb` or a database object — one `%test` per routine, with the `utplsql.generate.*` settings",
    "shortcut": "—"
  }
}
```
