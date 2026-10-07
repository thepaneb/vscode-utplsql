<!-- GENERATED FROM docs/brain/70-Wiki/Home (wiki).md — DO NOT EDIT -->

# utPLSQL Test Runner

Run and debug **utPLSQL** (Oracle PL/SQL) tests right in VS Code — native
**Test Explorer**, visual coverage, a PL/SQL debugger and **Oracle-direct**
execution via `node-oracledb`. Available in **24 UI languages**; requires
**VS Code 1.101+** (Node 22).

<p align="center">
  <a href="https://marketplace.visualstudio.com/items?itemName=paneb.vscode-utplsql"><img alt="Marketplace" src="https://vsmarketplacebadges.dev/version-short/paneb.vscode-utplsql.svg"></a>
  <a href="https://marketplace.visualstudio.com/items?itemName=paneb.vscode-utplsql"><img alt="Installs" src="https://vsmarketplacebadges.dev/installs-short/paneb.vscode-utplsql.svg"></a>
  <a href="https://marketplace.visualstudio.com/items?itemName=paneb.vscode-utplsql"><img alt="Downloads" src="https://vsmarketplacebadges.dev/downloads-short/paneb.vscode-utplsql.svg"></a>
  <a href="https://github.com/thepaneb/vscode-utplsql/actions/workflows/ci.yml"><img alt="CI" src="https://github.com/thepaneb/vscode-utplsql/actions/workflows/ci.yml/badge.svg"></a>
  <a href="https://codecov.io/gh/thepaneb/vscode-utplsql"><img alt="Coverage" src="https://codecov.io/gh/thepaneb/vscode-utplsql/branch/main/graph/badge.svg"></a>
  <img alt="VS Code" src="https://img.shields.io/badge/VS%20Code-1.101%2B-007ACC">
  <img alt="Node" src="https://img.shields.io/badge/node-22-339933?logo=nodedotjs&logoColor=white">
  <img alt="Oracle" src="https://img.shields.io/badge/Oracle-12.2%2B-F80000?logo=oracle&logoColor=white">
  <img alt="License" src="https://img.shields.io/badge/license-MIT-blue">
</p>

### Test Explorer & execution

- 🧪 **Native Test Explorer** — suites and tests appear in the testing view; run by test, suite, file, or folder ([Test-explorer](Test-explorer)).
- 🔍 **CodeLens** — Run/Run with Coverage buttons over `%suite` and `%test` in the editor, without leaving your code ([Editor-integration](Editor-integration)).
- ⌨️ **Keyboard shortcuts** — `Ctrl+Shift+U` prefix + key for the main commands (R = Run All, T = Run File, L = Rerun Last, etc.) ([Commands](Commands)).
- 🖱️ **Context menu** — right-click a **folder** or a **`.pks`/`.pkb`** file (in the Explorer or in the editor) to run tests ([Commands](Commands)).
- 🔁 **Smart Re-run** — Rerun Last, Run at Cursor, Run Failed Only with a single shortcut ([Editor-integration](Editor-integration)).
- 🧩 **Schema-aware tree** — organize tests by Schema > Package > Suite > Test in the Test Explorer ([Tree-organization](Tree-organization)).
- 🏷️ **Tags and random order** — filter tests with `utplsql.tags` (e.g. `fast & !integration`), run/select by tag, and run in random order with a reproducible seed ([Configuration](Configuration)).
- 🗄️ **Database-first discovery** — build the tree from `ut_runner.get_suites_info` and rebuild the annotation cache from the palette ([Test-explorer](Test-explorer)).
- 🌳 **Lazy test tree** — in `schema` mode, packages/suites/tests are resolved on demand when you expand, so large schemas open instantly ([Tree-organization](Tree-organization)).
- 📁 **Multi-root workspace** — every workspace folder gets its own suites, with independent discovery, execution and coverage ([Test-explorer](Test-explorer)).
- 🚀 **Oracle direct (via node-oracledb)** — real-time streaming, without waiting for the batch to finish ([Oracle-direct-execution](Oracle-direct-execution)).
- 📜 **SQL scripts** — run the current script, an Explorer file, or a whole folder against the active connection profile (charset-aware, with `DBMS_OUTPUT` and `stopOnError`) ([SQL-scripts](SQL-scripts)).

### Coverage

- 📊 **Visual coverage** — colored gutters per line (covered/not covered) and per-file percentage in the **Coverage** tab ([Coverage](Coverage)).
- 📈 **Statement and view coverage** — the Coverage tab shows `% of statements` (PROCEDURE/FUNCTION) per file and tracks views executed via `V$SQL` ([Coverage](Coverage)).
- 🎯 **Coverage scope** — include/exclude objects and schema/object regexes (`utplsql.coverage.*`) to drop framework noise and add dynamically reached objects ([Coverage](Coverage)).
- 🗂️ **Virtual database source** — with no local file, *jump to failure* and coverage open a read-only document resolved from `ALL_SOURCE` (`utplsql-source:/…`) ([Coverage](Coverage)).

### Debugger

- 🐛 **PL/SQL Debug** — breakpoints and step debugging of utPLSQL tests via `DBMS_DEBUG` (native Debug Adapter) ([Debugger](Debugger)).

### Connections & security

- 🔌 **Connection profiles** — save and switch between multiple environments (DEV/TEST/PROD) with per-profile settings, via status bar or command palette ([Connection-profiles](Connection-profiles)).
- 🔐 **TNS in thin + wallet** — `utplsql.connections.tnsAdminPath` resolves `tnsnames.ora` aliases in the thin driver (fallback to SQL Developer/`TNS_ADMIN`); the profile `walletLocation` and `utPLSQL: Set wallet password` keep the wallet password in the SecretStorage ([Connection](Connection)).
- 🔒 **Connection security hardening** — connection settings are `machine`-scoped, the extension is disabled in untrusted workspaces, and the profile password is bound to the connection ([Connection](Connection)).
- 🔧 **Setup diagnostics** — proactive validation of connection, grants, and version with quick-fix ([Diagnostics-and-quick-fix](Diagnostics-and-quick-fix)).

### Reporting

- 🧾 **Run with Reporter (Export)** — run the selection with any database reporter and write the output to the Output panel or a file (`utplsql.reporter.*`), without changing the Test Explorer results ([Reporters](Reporters)).

### UX & diagnostics

- ✅ **Inline decorations** — ✓/✗/⚠ icons in the editor after execution, with failure tooltip and overview ruler ([Editor-integration](Editor-integration)).
- 📌 **Status Bar** — indicator with pass/fail count, duration, and real-time progress ([Editor-integration](Editor-integration)).
- 🎯 **Jump to failure** — direct navigation to the line of the assertion that failed (via native "Go to Error") ([Editor-integration](Editor-integration)).
- 🧱 **Compilation diagnostics** — after every run, PL/SQL compilation errors (`ALL_ERRORS`) show up in the Problems Panel under the `utPLSQL Compilation` source ([Diagnostics-and-quick-fix](Diagnostics-and-quick-fix)).
- ⏳ **Progress and cancellation** — long runs show a progress notification with counts and a *Cancel* button (plus the optional `utplsql.timeoutMinutes`) ([Test-explorer](Test-explorer)).
- 🌍 **i18n — 24 languages** — `utplsql.language` follows VSCode (24 locales: pt-br, en, en-gb, es, zh-cn, zh-tw, ja, de, fr, it, ko, ru, tr, pl, cs, hu, bg, el, id, ro, sr, th, uk, vi) ([Internationalization](Internationalization)).

![Test Explorer with expanded suites](images/test-explorer-suites.png)

## Getting started

- [Installation and Requirements](Installation-and-requirements) — install the extension and the `UT3` framework.
- [Connection](Connection) — configure the Oracle connection (profiles, `UTPLSQL_CONN`, wallet).
- [Quick Start Guide](Quick-start) — run your first suite in a few steps.
- [FAQ](FAQ) — common questions.

## Navigation

Use the sidebar on the left (or the ≡ menu on mobile) to navigate between sections.

- **Getting Started**: [Installation and Requirements](Installation-and-requirements) · [Connection](Connection) · [Quick Start Guide](Quick-start)
- **Usage**: [Test Explorer](Test-explorer) · [Editor Integration](Editor-integration) · [Coverage](Coverage) · [SQL Scripts](SQL-scripts) · [Reporters](Reporters)
- **Advanced**: [Direct Oracle Execution](Oracle-direct-execution) · [PL/SQL Debugger](Debugger) · [Connection Profiles](Connection-profiles) · [Diagnostics and Quick-fix](Diagnostics-and-quick-fix) · [Tree Organization](Tree-organization)
- **Reference**: [Settings](Configuration) · [Commands](Commands) · [Internationalization](Internationalization) · [Database Requirements](Database-requirements)
- **Development**: [Architecture](Architecture) · [Contributing](Contributing) · [Tests](Tests) · [PRDs and Roadmap](PRDs)
- **Help**: [Troubleshooting](Troubleshooting) · [FAQ](FAQ)

## Links

- [Repository](https://github.com/thepaneb/vscode-utplsql)
- [Marketplace](https://marketplace.visualstudio.com/items?itemName=paneb.vscode-utplsql)
- [utPLSQL Framework](https://github.com/utPLSQL/utPLSQL)

## Disclaimer

> [!WARNING]
> **This is an independent community project.** It is **not affiliated with,
> endorsed by, or sponsored by** the utPLSQL framework team or Oracle
> Corporation. **utPLSQL** and **Oracle** are trademarks of their respective
> owners.
