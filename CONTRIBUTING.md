# Contributing to utPLSQL Test Runner

Thank you for considering contributing to **utPLSQL Test Runner**! This document explains how to propose changes, report bugs and send pull requests.

This project follows the [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold it.

## How can I contribute?

### Reporting bugs

Before opening an issue, check whether it already exists in the [issues](https://github.com/thepaneb/vscode-utplsql/issues) list. When reporting a bug, include:

- **Clear, descriptive title**
- **Steps to reproduce** the problem
- **Expected behavior** vs. **observed behavior**
- **Relevant configuration** (`utplsql.*` in `settings.json`)
- **Environment**: VS Code version, OS, Oracle and utPLSQL (UT3) versions
- **Logs** from the test terminal, if possible

### Suggesting improvements

Open an issue describing:

- The problem the improvement solves
- How it would work in practice (e.g. a new setting, a new context-menu command, a new reporter)
- Whether it affects test discovery, execution or coverage

### First code contribution

Good starting points:

- Issues labeled `good first issue` or `help wanted`
- Documentation improvements (README, wiki, examples)
- Extra case coverage in the mapping conventions (by directory, prefix, extension)

## Setting up the development environment

### Prerequisites

- **Node.js** and npm
- **VS Code 1.101+**
- An **Oracle** database with the **utPLSQL (UT3)** framework installed, to test the extension end to end
- **Docker** (optional) for the version matrix (`npm run db:matrix`)

### Steps

```bash
# Clone your fork
git clone https://github.com/your-user/vscode-utplsql.git
cd vscode-utplsql

# Install dependencies
npm install

# Compile the TypeScript
npm run compile
```

To test the extension in development mode, open the project in VS Code and press `F5` to start an Extension Development Host window.

### Running the tests

```bash
npm test              # unit tests + lint (fast, no database)
npm run test:coverage # unit tests with coverage thresholds
```

The unit tests use `node --test`; the integration tests use `@vscode/test-cli`
(`.vscode-test.mjs`).

### Integration tests

They run against a real Oracle and are enabled by the `UTPLSQL_CONN` env var (without it, they become `describe.skip`):

```bash
export UTPLSQL_CONN='UT3/password@//localhost:1521/freepdb1'
npm run test:integration        # full suite
npm run test:integration:smoke  # fast subset (capabilities + DBMS_DEBUG)
```

> On WSL, because `node` is the Windows binary, the variable has to cross over
> via `WSLENV`: `export WSLENV="UTPLSQL_CONN${WSLENV:+:$WSLENV}"`. The
> `npm run db:matrix` already does this.

### Database matrix (local, multiple versions)

To validate against several Oracle versions without depending on a fixed database:

```bash
npm run db:matrix:list                 # list the matrix versions
npm run db:matrix                      # run the whole matrix (one version at a time)
npm run db:matrix -- --only 21xe       # a single version
npm run db:matrix -- --smoke           # fast subset per version
npm run db:matrix -- --thick           # thick mode (Instant Client) per version
npm run db:matrix -- --skip-bootstrap  # volume already prepared: skip utPLSQL/fixtures
npm run db:matrix -- --clean           # delete the volume and recreate the database from scratch
npm run db:matrix -- --keep-db --only 23free  # do not tear down the container at the end
```

The orchestrator (`scripts/db-matrix/run.sh`) pulls the image, brings up the container, waits for the PDB to open, installs utPLSQL + grants + schemas/fixtures and runs the tests; at the end it tears down the container, **preserving the data volume**.

**Persistence:** each version has its own named volume
(`utplsql-dbmatrix-<label>`, mounted at `/opt/oracle/oradata`). The **first** run creates the database (~15–25 min for 18c/19c); the following ones come up from the volume in ~1–2 min. Use `--skip-bootstrap` when the volume is already prepared (skips the utPLSQL reinstall) and `--clean` to delete the volume and start over. Requirements: Docker and, for the `database/enterprise` images, `ORACLE_AUTH_USER`/`ORACLE_AUTH_TOKEN` in `.env.dbmatrix` (see `.env.dbmatrix.example`). CI does **not** run the matrix — it is local and manual. The target version and details are in PRD-72.

### Thick mode (Instant Client)

Optional and local. Thick initialization is **global and irreversible** in the extension host process, so it runs in an isolated host (a workspace with no `.pks`, and the host gets **no** `UTPLSQL_CONN`, so the extension — which activates on `onStartupFinished` — does not open a thin connection first; the test connection comes via `UTPLSQL_THICK_CONN`):

```bash
# point to an Oracle Instant Client (Basic/Basic Light) on your machine
export ORACLE_CLIENT_LIB_DIR='C:\oracle\instantclient_23_0'
npm run test:integration:thick
```

In the matrix: `npm run db:matrix -- --thick` (or `--only <version> --thick`).
Without `ORACLE_CLIENT_LIB_DIR`, `thickMode.test.ts` is `skip`.

## Project structure

- `src/` — extension TypeScript source
- `scripts/` — helper scripts
- `.vscode/` — debug/launch configuration for development
- `docs/brain/` — **second brain** (Obsidian vault): source of truth for human text
- `docs/functional/`, `docs/wiki/`, `docs/prd/`, `README*.md` — **generated** from the vault (`npm run brain:build`); do not edit by hand
- `images/` — icons and screenshots used in the README
- `package.json` — extension manifest (commands, settings, activation)

## Documentation

Human text is edited in the vault (`docs/brain/`) and the repo artifacts are generated from it:

```sh
npm run brain:sync    # code facts -> vault (stack, deps, counts)
npm run brain:build   # vault -> repo (README*, docs/wiki, docs/functional, docs/prd)
npm run docs:check    # consistency + code<->docs fidelity (runs in CI)
```

- README and variants: note `60-README/README (extensão)` in the vault.
- Wiki: notes in `70-Wiki/` (published by the `wiki.yml` workflow).
- PRDs: notes in `20-PRDs/` (status in the frontmatter) — see the `prd-workflow` skill.

> `docs/brain/` is protected by `.github/CODEOWNERS`. PRs that touch the vault (or
> the generated artifacts) require a clean `npm run brain:ci` + `git diff --exit-code`
> — CI rejects drift between the vault and the generated files.

## Pull Requests

1. Fork and create your branch from `main`.
2. If you change configurable behavior, update the `60-README/README (extensão)` note
   in the vault and run `npm run brain:build` (the **Configuration** table of `README.md` is generated).
3. If you add/change settings in `package.json`, keep the descriptions in **English**, consistent with the rest of the project.
4. Run `npm run compile` and `npm test` before opening the PR. Run `npm run brain:ci` if you touched documentation.
5. Write a clear commit message and, if applicable, reference the related issue (`Closes #42`).
6. Open the PR describing what changed and why. Screenshots are welcome for UI changes (gutters, Test Explorer, Coverage).

### Commit conventions

- Use the imperative: "Add support for..." instead of "Added support for..."
- First line with up to ~72 characters
- Reference related issues/PRs when they exist

## Code style

- TypeScript, following the style already used in `src/`
- Avoid introducing new dependencies without discussing them first in an issue
- Execution is **Oracle-direct** (node-oracledb, thin by default; thick is opt-in)
  — changes in `oracleRunner.ts`/`discovery.ts` must consider both driver modes
  and the shared install (`ALL_SYNONYMS`)

## Review process

1. A maintainer will review your PR and may request adjustments.
2. After approval, the PR is merged and goes into the next `CHANGELOG.md`.
3. Versioning follows [SemVer](https://semver.org/).

## Questions?

Open an issue labeled `question` or comment directly on the related PR.

Thank you for helping improve utPLSQL Test Runner! 🧪
