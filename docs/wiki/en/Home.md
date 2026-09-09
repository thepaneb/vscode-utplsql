[Português](../Home.md)

# utPLSQL Test Runner

Integrates [utPLSQL](https://www.utplsql.org/) into VSCode, bringing PL/SQL tests
into the native **Test Explorer**, with context menu and visual coverage.

- **Native Test Explorer** — suites and tests appear in the test view
- **CodeLens** — Run/Run with Coverage buttons over `%suite` and `%test` in the editor
- **Keyboard shortcuts** — `Ctrl+Shift+U` prefix + key for main commands (R = Run All, T = Run File, L = Rerun Last, etc.)
- **Context menu** — right-click on a folder or `.pks`/`.pkb` file
- **Visual coverage** — colored gutters + percentage per file
- **Inline decorations** — ✓/✗/⚠ icons in the editor after execution with failure tooltip
- **Status Bar** — indicator with pass/fail count and duration
- **Smart Re-run** — Rerun Last, Run at Cursor, Run Failed Only with a shortcut
- **Oracle streaming** — direct execution via node-oracledb with real-time results
- **Schema-aware tree** — organize tests by Schema > Package > Suite > Test
- **Diagnostics and quick-fix** — PL/SQL errors in the editor + setup validation with Code Actions
- **Jump to failure** — navigation to the failed assertion line (native Go to Error)

![Test Explorer with expanded suites](images/test-explorer-suites.png)

## Navigation

Use the sidebar on the left (or the ≡ menu on mobile) to navigate between sections.

- **Getting Started**: [Installation and Requirements](Instalação-e-requisitos) · [Connection](Conexão)
- **Usage**: [Quick Start Guide](Guia-rápido) · [Coverage](Cobertura) · [Reporters](Reporters)
- **Advanced**: [Direct Oracle Execution](Execução-Oracle-direta) · [Diagnostics and Quick-fix](Diagnósticos-e-quick-fix) · [Tree Organization](Organização-da-árvore)
- **Reference**: [Settings](Configurações) · [Commands](Comandos) · [Database Requirements](Requisitos-no-banco)
- **Development**: [Architecture](Arquitetura) · [Contributing](Como-contribuir) · [Tests](Testes) · [PRDs and Roadmap](PRDs)
- **Help**: [Troubleshooting](Troubleshooting) · [FAQ](FAQ)

## Links

- [Repository](https://github.com/thepaneb/vscode-utplsql)
- [Marketplace](https://marketplace.visualstudio.com/items?itemName=paneb.vscode-utplsql)
- [utPLSQL Framework](https://github.com/utPLSQL/utPLSQL)
