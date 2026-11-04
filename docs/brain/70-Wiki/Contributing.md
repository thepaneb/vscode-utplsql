---
tipo: wiki
status: ativo
titulo: "Contributing"
publicar: docs/wiki/Contributing.md
origem: ["MOC - Documentacao"]
verificado: 2026-10-29
regras: ["BR-PLAT-002", "BR-PLAT-003", "BR-PLAT-004", "BR-QUAL-002", "BR-TEST-003", "BR-DOC-001", "BR-DOC-002"]
tags: [wiki]
---

# Contributing

<!-- prd:PRD-47 --> <!-- prd:PRD-124 --> <!-- prd:PRD-125 -->

<!-- prd:PRD-98 -->
<!-- prd:PRD-104 -->
<!-- prd:PRD-113 -->
<!-- prd:PRD-114 -->
<!-- prd:PRD-118 -->
<!-- prd:PRD-119 -->

## CI and supply chain

Actions are pinned by **commit SHA** (with the version in a comment), every
workflow declares least-privilege `permissions:` at the top, and Dependabot
updates `npm` and `github-actions` weekly (minor/patch grouped). CI gates
production dependencies with `npm audit --omit=dev --audit-level=high`; the
wiki token is never embedded in the clone URL (it uses an ephemeral
`http.extraheader`). CodeQL runs via GitHub's **default setup** — there is no
committed `codeql.yml`.

## Lint and formatting

`npm run lint` runs **`biome check .`** over the manifests (`package.json`,
`package.nls*.json`), configs and `scripts/**`; generated/vendorized directories
(`docs`, `site`, `out`, `dist`, `coverage`, `.vscode-test`, `.agents`,
`.opencode`, `.kilo`) are excluded. Run `npm run lint:fix` before opening a PR —
CI runs the same check.

## Typed VS Code stub

Unit tests use `src/test/vscode-stub.ts`, typed against `@types/vscode`:
`vscode-stub.types.ts` validates the contract in `tsc`, `vscodeApiInventory`
fails when a runtime API used by `src/**` is missing from the stub, and
`anyBudget.test.ts` prevents `any` regressions. Prefer the typed helpers in
`src/test/fixtures.ts` (`makeTestItem`, `makeTestRun`, `makeUri`, …) over
`as any` when building fixtures.

## Feature registry

`docs/brain/10-Projeto/Registro de features.md` is the structured source for
README bullets, wiki mentions and LinkedIn posts/cards. `npm run
docs:features-check -- <version>` validates every completed PRD of the version;
internal enablers use `interno: true` and only require the CHANGELOG entry.

Guide for setting up the development environment and submitting contributions.

## Prerequisites

- **Node.js 24+** (`.nvmrc` points to 24; CI tests 24/26)
- **npm** (comes with Node)
- **Git**
- (Optional) **Oracle Database** + **utPLSQL** for integration tests

## Environment setup

```bash
# Clone the repository
git clone https://github.com/thepaneb/vscode-utplsql.git
cd vscode-utplsql

# Install dependencies
npm install

# Compile TypeScript
npm run compile
```

## Project structure

```
vscode-utplsql/
├── src/
│   ├── extension.ts         ← orchestrator (entry point)
│   ├── runner.ts            ← executeRun + applyResults/applyCoverage wrappers
│   ├── oracleRunner.ts      ← executeRunOracle (streaming + pool) + utPLSQL schema discovery
│   ├── results.ts           ← canonical result/coverage functions (PRD-44)
│   ├── config.ts            ← settings + env vars reading + resolveConnection
│   ├── connectionProfiles.ts ← connection profile CRUD + picker
│   ├── discovery.ts         ← findFiles + parse + DB-based discovery (PRD-43)
│   ├── suiteParser.ts       ← regex %suite/%test + annotations (pure)
│   ├── junit.ts             ← JUnit XML parsing + stack frames (pure)
│   ├── cobertura.ts         ← Cobertura XML parsing (pure)
│   ├── coverage.ts          ← coverage filename → source URI resolution
│   ├── viewCoverage.ts      ← optional V$SQL view tracking
│   ├── matching.ts          ← URI/folder filtering + result→test matching (pure)
│   ├── codelens.ts          ← parseCodeLensItems (pure) + CodeLensProvider
│   ├── plsqlDeclarations.ts ← declaration coverage derived from source (pure)
│   ├── quickfix.ts          ← SetupValidator + Code Actions
│   ├── decorations.ts       ← inline pass/fail decorations
│   ├── statusBar.ts         ← status indicator
│   ├── scriptRunner.ts      ← SQL script execution (editor/file/folder, PRD-62)
│   ├── debugger.ts          ← DBMS_DEBUG debug adapter
│   ├── dbmsDebug.ts         ← DBMS_DEBUG client (pure SQL/parse)
│   ├── i18n.ts              ← translation runtime (pure)
│   ├── i18nLocales.ts       ← locale catalogs (pure)
│   ├── state.ts             ← session state (pure)
│   ├── types.ts             ← interfaces (type-only)
│   └── test/
│       ├── unit/            ← tests with node --test
│       └── integration/     ← tests with @vscode/test-cli
├── dist/                    ← esbuild bundle (generated; main = dist/extension.js)
├── docs/
│   ├── prd/                 ← Product Requirements Documents
│   ├── functional/          ← functional specification
│   └── wiki/                ← wiki content
├── .github/workflows/       ← CI/CD
├── esbuild.config.mjs       ← bundling (PRD-45)
├── package.json
├── tsconfig.json
├── biome.json               ← linter + formatter
└── README.md
```

## Commands

```sh
npm install              # dependencies
npm run compile          # tsc → out/
npm run watch            # incremental compilation
npm run lint             # biome check src/
npm run lint:fix         # biome check --write src/
npm run format           # biome format --write src/
npm run test:unit        # pretest:unit (compile+lint) → node scripts/run-tests.cjs
npm run test:integration # pretest:integration (compile+bundle) → vscode-test
npm run test:coverage    # compile → c8 node --test (thresholds 97/93/97)
npm test                 # = test:unit
npm run bundle           # esbuild → dist/ (actual extension main)
npm run package          # compile + bundle + vsce package → .vsix
npm run sync-prds        # sync PRDs with GitHub issues
```

Run a single unit test:

```bash
node --test out/test/unit/junit.test.js
node --test --test-name-pattern "duration" out/test/unit/**/*.test.js
```

## Debugging

Press **F5** in VSCode (`.vscode/launch.json` configured) to open an
**Extension Development Host** instance with the extension loaded.
You can open a PL/SQL project in that window and test the extension
interactively.

![Extension Development Host with Testing view](images/dev-host-testing.png)

> If the **Extension Host** output shows `TypeError: Missing dataLength in event`
> (`node:inspector`), it comes from the JS debugger's experimental *Network
> View*, not from this extension. `.vscode/launch.json` already sets
> `"experimentalNetworking": "off"`; if it still appears, set
> `"debug.javascript.enableNetworkView": false` in your User settings.

## Integration tests with a real database

Create a `.env` file in the project root (gitignored):

```bash
UTPLSQL_CONN=your_user/password@//host:1521/service
```

Run:

```bash
npm run test:integration
```

Without the env vars, database tests (`describeDB`) are automatically
skipped.

### Database test matrix (multiple Oracle versions)

Spin up a real Oracle for integration tests against several versions, one at a
time (`scripts/db-matrix/run.sh`; needs Docker, and `ORACLE_AUTH_USER`/
`ORACLE_AUTH_TOKEN` in `.env.dbmatrix` for the Enterprise images):

```bash
npm run db:matrix:list                 # versions: 11xe (thick-only), 12.2, 18xe, 19ee, 21xe, 23free
npm run db:matrix                      # whole matrix (one version at a time)
npm run db:matrix -- --only 21xe       # a single version
npm run db:matrix -- --smoke           # fast subset (capabilities + debugger)
npm run db:matrix -- --thick           # thick mode per version
npm run db:matrix -- --thick-full      # thick-full (experimental; exclui thin-only/UI; PRD-125)
npm run db:matrix -- --only 11xe --thick  # Oracle 11g (thick-only)
npm run db:matrix -- --clean           # wipe the data volume and recreate
```

Data is kept in a per-version Docker volume: the first run creates the database
(~15–25 min for 18c/19c); later runs boot from it in ~1–2 min. Use
`--skip-bootstrap` when the volume is already prepared. See PRD-72 and the
root `CONTRIBUTING.md` for details.

> **Windows + WSL:** quote the Windows path in `.env.dbmatrix`, e.g.
> `ORACLE_CLIENT_LIB_DIR="D:\oracle\instantclient_23_0"`. The `source` in
> `run.sh` consumes unquoted backslashes and the thick test fails with
> `DPI-1047` (the path arrives as `D:Users...`). The same path in `.env` is
> parsed by the test config (no shell expansion), so it only bites the matrix.

**Alternative utPLSQL floors:** each `VERSIONS` line may declare a 4th field
with the utPLSQL version for that database. `11.2` and `12.2` use **`v3.1.14`** because
`v3.2.x` does not compile on them (`PLS-00222`); lines without the 4th field fall
back to `UTPLSQL_VERSION` (PRD-84). The 11g entry is **thick-only** (thin starts at 12.1) and uses `DBMS_PROFILER` for coverage (PRD-123).

## Code conventions

Style defined in `biome.json` and enforced via `npm run lint` + `npm run format`:

- Indent: **2 spaces**
- Line width: **100 characters**
- Quotes: **single** (`'`)
- Semicolons: **always** (`;`)
- Trailing commas: **always** (`,`)
- Linter: **recommended** preset

## Contribution workflow

1. **Fork** the repository
2. Create a **branch**: `git checkout -b feature/my-change`
3. Make your changes following the conventions
4. Run `npm run lint` and `npm test` — they must pass
5. Commit with a clear message
6. Push and open a **Pull Request** targeting `main`

### Commit message

Format: `<type>: <description> [(PRD-NN)]`

```
feat: add support for dynamic reporters (PRD-10)
fix: fix coverage mapping on Windows
docs: update troubleshooting section
```

If the change completes a PRD, reference `Closes #N` in the commit/PR body.

## Keeping the README and wiki updated

- **New settings** → add to the README configuration table and the wiki
  [[Configuration]] page
- **New commands** → add to the README Commands section and the wiki
  [[Commands]] page
- **New behaviors** → if relevant for troubleshooting, add to the wiki
  [[Troubleshooting]] page
- **Architecture changes** → update the [[Architecture]] page

The wiki is automatically synced via workflow when pushing to the `main`
branch (files in `docs/wiki/`).
