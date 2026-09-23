---
tipo: wiki
status: ativo
titulo: "utPLSQL Test Runner"
publicar: docs/wiki/Home.md
verificado: 2026-09-23
tags: [wiki]
---

# utPLSQL Test Runner

Integrates [utPLSQL](https://www.utplsql.org/) into VSCode, bringing PL/SQL tests
into the native **Test Explorer**, with context menu and visual coverage.

- [[Test-explorer|**Native Test Explorer**]] — suites and tests appear in the test view
- [[Editor-integration|**CodeLens**]] — Run/Run with Coverage buttons over `%suite` and `%test` in the editor
- [[Commands|**Keyboard shortcuts**]] — `Ctrl+Shift+U` prefix + key for main commands (R = Run All, T = Run File, L = Rerun Last, etc.)
- [[Commands|**Context menu**]] — right-click on a folder or `.pks`/`.pkb` file
- [[Coverage|**Visual coverage**]] — colored gutters + percentage per file
- [[Editor-integration|**Inline decorations**]] — ✓/✗/⚠ icons in the editor after execution with failure tooltip
- [[Editor-integration|**Status Bar**]] — indicator with pass/fail count and duration
- [[Editor-integration|**Smart Re-run**]] — Rerun Last, Run at Cursor, Run Failed Only with a shortcut
- [[Oracle-direct-execution|**Oracle streaming**]] — direct execution via node-oracledb with real-time results
- [[Tree-organization|**Schema-aware tree**]] — organize tests by Schema > Package > Suite > Test
- [[Diagnostics-and-quick-fix|**Diagnostics and quick-fix**]] — setup validation with Code Actions
- [[Editor-integration|**Jump to failure**]] — navigation to the failed assertion line (native Go to Error)
- [[Connection-profiles|**Connection profiles**]] — save and switch between environments (DEV/TEST/PROD) with per-profile settings
- [[Coverage|**Statement and view coverage**]] — `% of statements` per file, and views tracked via `V$SQL`
- [[Coverage|**Coverage scope**]] — include/exclude objects and schema/object regexes (`utplsql.coverage.*`)
- [[Configuration|**Tag filter and random order**]] — filter tests with `utplsql.tags` and run in random order with a reproducible seed
- [[Test-explorer|**Database-first discovery**]] — suites from `ut_runner.get_suites_info` (fallback to `ALL_SOURCE`) plus the **Rebuild Annotation Cache** command
- [[Debugger|**PL/SQL Debug**]] — breakpoints and step debugging via `DBMS_DEBUG`
- [[Internationalization|**i18n — 24 languages**]] — follows the VSCode display language
- [[SQL-scripts|**SQL scripts**]] — run the current script, a file, or a whole folder against the active connection profile

![Test Explorer with expanded suites](images/test-explorer-suites.png)

## Navigation

Use the sidebar on the left (or the ≡ menu on mobile) to navigate between sections.

- **Getting Started**: [[Installation-and-requirements|Installation and Requirements]] · [[Connection]]
- **Usage**: [[Quick-start|Quick Start Guide]] · [[Test-explorer|Test Explorer]] · [[Editor-integration|Editor Integration]] · [[Coverage]] · [[SQL-scripts|SQL Scripts]] · [[Reporters]]
- **Advanced**: [[Oracle-direct-execution|Direct Oracle Execution]] · [[Debugger|PL/SQL Debugger]] · [[Connection-profiles|Connection Profiles]] · [[Diagnostics-and-quick-fix|Diagnostics and Quick-fix]] · [[Tree-organization|Tree Organization]]
- **Reference**: [[Configuration|Settings]] · [[Commands]] · [[Internationalization]] · [[Database-requirements|Database Requirements]]
- **Development**: [[Architecture]] · [[Contributing]] · [[Tests]] · [[PRDs|PRDs and Roadmap]]
- **Help**: [[Troubleshooting]] · [[FAQ]]

## Links

- [Repository](https://github.com/thepaneb/vscode-utplsql)
- [Marketplace](https://marketplace.visualstudio.com/items?itemName=paneb.vscode-utplsql)
- [utPLSQL Framework](https://github.com/utPLSQL/utPLSQL)
