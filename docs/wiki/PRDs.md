# PRDs and roadmap

The extension uses **Product Requirements Documents** (PRDs) to plan and
track features.

## What are PRDs

Markdown documents in `docs/prd/` that describe a proposed change:
context, requirements, solution, test plan, and rollout. Each PRD goes
through a 4-stage lifecycle.

## Lifecycle

```
⚪ Proposed  →  🔵 Approved  →  🟡 In development  →  🟢 Completed
proposed/       approved/       in-progress/              completed/
```

The **folder** where the file lives is the source of truth for its status.
The file is moved between folders as it progresses.

## Current roadmap

### 🟢 Completed

| # | PRD | Version |
|---|---|---|
| 01 | `java` invocation mode (launcher bypass) | 0.3.0 |
| 02 | `extension.ts` refactoring | 0.4.0 |
| 03 | CI pipeline + Linter | 0.4.0 |
| 04 | Test coverage expansion | 0.4.0 |
| 05 | Progress feedback and cancellation | 0.5.0 |
| 06 | Multiple workspace folders support | 0.5.0 |
| 07 | Node 24 + TypeScript 6.0 upgrade | 0.4.0 |
| 08 | Advanced CLI options exposed as settings | 0.5.0 |
| 09 | `utplsql info` diagnostics | 0.5.0 |
| 10 | Dynamic reporters | 0.7.0 |
| 11 | Real-time result streaming | 0.9.0 |
| 13 | Test infrastructure with real Oracle | 0.6.0 |
| 14 | utPLSQL test schema and objects | 0.6.0 |
| 15 | Integration tests with real database | 0.6.0 |
| 16 | Integration tests for both invocation modes | 0.6.0 |
| 17 | Custom JVM flags for the `java` mode | 0.9.0 |
| 18 | `engines.node` alignment with CI | 0.7.1 |
| 19 | PRD system normalization | 0.7.1 |
| 20 | Dependencies and configuration cleanup | 0.7.1 |
| 21 | CI/CD workflow improvements | 0.11.0 |
| 22 | Sync images in wiki workflow | 0.7.1 |
| 23 | Wiki screenshots: checklists + diagrams | 0.10.0 |
| 24 | CodeLens Integration | 0.8.0 |
| 25 | Status Bar Indicator | 0.8.0 |
| 26 | Inline Test Result Decorations | 0.8.0 |
| 27 | Default Keybindings | 0.8.0 |
| 28 | PL/SQL Compilation Diagnostics | 0.9.0 |
| 29 | Jump to Failing Assertion | 0.9.0 |
| 30 | Schema-Aware Test Organization | 0.9.0 |
| 31 | Smart Re-run Patterns | 0.8.0 |
| 32 | Quick-Fix Setup Diagnostics | 0.9.0 |
| 35 | Windows coverage fix | 0.7.2 |
| 36 | Reporter parse fix with descriptions | 0.7.2 |
| 37 | TypeScript code coverage with `c8` | 0.9.0 |
| 38 | Connection Pooling in Oracle Runner | 0.10.0 |
| 39 | Eliminate duplicate code between runners | 0.10.0 |
| 40 | Refactor executeRunOracle: Options Object | 0.10.0 |
| 41 | utPLSQL installation verification | 0.11.0 |
| 42 | SuiteParser: extended annotation parsing | 0.10.0 |
| 43 | Schema-mode: discovery via ALL_OBJECTS/ALL_SOURCE | 0.11.0 |
| 44 | Result→test matching as a pure function | 0.11.0 |
| 45 | Bundling with esbuild + node-oracledb tree-shaking | 0.11.0 |
| 46 | Major dependency updates | 0.11.0 |
| 34 | Multi-Connection Profiles | 0.12.0 |
| 48 | Derived Function Coverage (DeclarationCoverage) | 0.12.0 |
| 12 | SQL coverage (views, queries) | 0.12.0 |
| 33 | PL/SQL Debugger Integration | 0.12.0 |
| 49 | Internationalization (i18n) of text content | 0.12.0 |
| 62 | SQL script execution against connection profiles | 0.12.0 |
| 63 | Bilingual wiki (pt-BR/en); English-only since 0.12.1 | 0.12.0 |
| 64 | Oracle-only migration (drop utPLSQL-cli/Java) | 0.12.0 |
| 65 | Schema-mode and security fixes | 0.12.0 |
| 66 | Connection robustness, logging and cache | 0.12.0 |
| 67 | Code quality, cleanup and performance | 0.12.0 |
| 68 | Restore Oracle diagnostics and session reporter | 0.12.0 |
| 70 | Optional thick mode (Instant Client) for NNE | 0.12.1 |
| 71 | Fix the debugger for the real `DBMS_DEBUG` | 0.12.1 |
| 72 | Oracle database test matrix | 0.12.1 |
| 73 | Compile for Debug (command + menus) | 0.12.1 |
| 69 | Oracle Runner: typed binds, `a_tags` and reporter validation | 0.13.0 |
| 74 | DB-first suite discovery (`get_suites_info`) | 0.13.0 |
| 77 | Rebuild the utPLSQL annotation cache | 0.13.0 |
| 78 | Random test order with seed | 0.13.0 |
| 79 | Advanced coverage scope (regex + exclusions) | 0.13.0 |
| 83 | VSIX package hygiene | 0.13.0 |
| 84 | Oracle 12.2 support (alternative utPLSQL floor) + charset | 0.13.0 |

### 🔵 Approved / 🟡 In development

| # | PRD | Target version |
|---|---|---|
| 47 | Node 26 in development toolchain | 0.14.0 |

### ⚪ Proposed

| # | PRD | Target version |
|---|---|---|
| 75 | Lazy test tree (incremental resolution) | 0.14.0 |
| 76 | Run/export with an arbitrary reporter | 0.14.0 |
| 80 | Virtual database source document | 0.14.0 |
| 81 | Connection settings security hardening | 0.14.0 |
| 82 | TNS resolution in thin + wallet password in SecretStorage | 0.14.0 |
| 50–61 | Auto-run, tags, inline diff, debug variants, coverage toggle, multi-root, scaffold… | 0.15.0+ |

## How to propose a PRD

1. Copy `docs/prd/template.md` to `docs/prd/proposed/prd-NN-slug.md`
2. Fill in all fields
3. Update `docs/prd/index.md` (table + tree)
4. Run `sync-prds` to create the GitHub issue

The full catalog is at `docs/prd/index.md`. Corresponding issues are on
[GitHub Issues](https://github.com/thepaneb/vscode-utplsql/issues)
with labels `prd:*`.
