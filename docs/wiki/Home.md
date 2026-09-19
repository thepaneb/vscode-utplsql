# utPLSQL Test Runner

Integrates [utPLSQL](https://www.utplsql.org/) into VSCode, bringing PL/SQL tests
into the native **Test Explorer**, with context menu and visual coverage.

- [**Native Test Explorer**](Test-explorer) — suites and tests appear in the test view
- [**CodeLens**](Editor-integration) — Run/Run with Coverage buttons over `%suite` and `%test` in the editor
- [**Keyboard shortcuts**](Commands) — `Ctrl+Shift+U` prefix + key for main commands (R = Run All, T = Run File, L = Rerun Last, etc.)
- [**Context menu**](Commands) — right-click on a folder or `.pks`/`.pkb` file
- [**Visual coverage**](Coverage) — colored gutters + percentage per file
- [**Inline decorations**](Editor-integration) — ✓/✗/⚠ icons in the editor after execution with failure tooltip
- [**Status Bar**](Editor-integration) — indicator with pass/fail count and duration
- [**Smart Re-run**](Editor-integration) — Rerun Last, Run at Cursor, Run Failed Only with a shortcut
- [**Oracle streaming**](Oracle-direct-execution) — direct execution via node-oracledb with real-time results
- [**Schema-aware tree**](Tree-organization) — organize tests by Schema > Package > Suite > Test
- [**Diagnostics and quick-fix**](Diagnostics-and-quick-fix) — setup validation with Code Actions
- [**Jump to failure**](Editor-integration) — navigation to the failed assertion line (native Go to Error)
- [**Connection profiles**](Connection-profiles) — save and switch between environments (DEV/TEST/PROD) with per-profile settings
- [**Statement and view coverage**](Coverage) — `% of statements` per file, and views tracked via `V$SQL`
- [**PL/SQL Debug**](Debugger) — breakpoints and step debugging via `DBMS_DEBUG`
- [**i18n — 24 languages**](Internationalization) — follows the VSCode display language
- [**SQL scripts**](SQL-scripts) — run the current script, a file, or a whole folder against the active connection profile

![Test Explorer with expanded suites](images/test-explorer-suites.png)

## Navigation

Use the sidebar on the left (or the ≡ menu on mobile) to navigate between sections.

- **Getting Started**: [Installation and Requirements](Installation-and-requirements) · [Connection](Connection)
- **Usage**: [Quick Start Guide](Quick-start) · [Test Explorer](Test-explorer) · [Editor Integration](Editor-integration) · [Coverage](Coverage) · [SQL Scripts](SQL-scripts) · [Reporters](Reporters)
- **Advanced**: [Direct Oracle Execution](Oracle-direct-execution) · [PL/SQL Debugger](Debugger) · [Connection Profiles](Connection-profiles) · [Diagnostics and Quick-fix](Diagnostics-and-quick-fix) · [Tree Organization](Tree-organization)
- **Reference**: [Settings](Configuration) · [Commands](Commands) · [Internationalization](Internationalization) · [Database Requirements](Database-requirements)
- **Development**: [Architecture](Architecture) · [Contributing](Contributing) · [Tests](Tests) · [PRDs and Roadmap](PRDs)
- **Help**: [Troubleshooting](Troubleshooting) · [FAQ](FAQ)

## Links

- [Repository](https://github.com/thepaneb/vscode-utplsql)
- [Marketplace](https://marketplace.visualstudio.com/items?itemName=paneb.vscode-utplsql)
- [utPLSQL Framework](https://github.com/utPLSQL/utPLSQL)
