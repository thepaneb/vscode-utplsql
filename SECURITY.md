# Security Policy

## Supported versions

As a VS Code extension, only the **latest version published on the Marketplace** receives security fixes. We recommend always keeping the extension up to date.

| Version              | Supported          |
| -------------------- | ------------------ |
| Latest (Marketplace) | :white_check_mark: |
| Previous versions    | :x:                |

## Scope

This policy covers vulnerabilities in the **utPLSQL Test Runner** extension itself (TypeScript code, the `package.json` manifest, bundled scripts). It does not cover:

- Vulnerabilities in **utPLSQL-cli** or the **utPLSQL (UT3)** framework — report them directly to the [official utPLSQL repository](https://github.com/utPLSQL/utPLSQL-cli).
- Vulnerabilities in **VS Code** itself — report them to Microsoft.
- Insecure configurations of the user's own Oracle database (credentials, network permissions, etc.), which are outside the extension's control.

## Areas of specific concern for this project

The extension connects directly to Oracle via `node-oracledb` (no external CLI) and reads user settings to build the connection and the run. Particularly sensitive areas include:

- Storage and use of **Oracle connection credentials** (user/password) and the wallet password.
- Visibility of **secrets in error messages, logs and run output**.
- Reading workspace settings (`.vscode/settings.json`) that may come from untrusted repositories.
- Generating coverage reports and **writing files** only inside the workspace roots.

If you identify a problem in any of these areas, it is considered a security vulnerability, even if it looks like an ordinary "bug".

## Implemented protections

- **`machine`-scoped connection settings** (`utplsql.connection`, `utplsql.profiles`, `utplsql.activeProfile`, `utplsql.oracleClientLibDir`, `utplsql.oracleClientConfigDir`): a third-party `.vscode/settings.json` **cannot** override them.
- **Extension disabled in untrusted workspaces** (`capabilities.untrustedWorkspaces.supported: false`): it only connects after the folder is trusted.
- **Passwords in `SecretStorage`** (the OS keychain), never in `settings.json`, and **bound to the connection**: if the profile's `connection` changes, the stored password is discarded instead of being sent to the new host.
- **Credential masking** in all output (picker, logs, error messages): the password never appears. Every connection-cycle call site redacts the exact known connection (`redactConnection`), and the dev scripts never print the raw connection (`BR-CONN-020`).
- **No user value concatenated into PL/SQL** — everything goes as a bind; reporter names are validated against an allowlist.
- **Schema identifier validation**: the `UT3.` prefix discovered from `ALL_SYNONYMS.TABLE_OWNER` is validated as an Oracle identifier before any concatenation; an atypical owner is treated as “no prefix” with a sanitized warning (`SEC-014` / `BR-EXEC-017`).
- **No shell injection/eval in dev scripts**: `create-pr.cjs` validates `--base`/`--head` and uses `execFileSync`; `create-release.cjs` escapes the version in the CHANGELOG regex; `db-matrix/run.sh` runs the test command in an explicit subshell without `eval`.
- **CI supply chain**: all actions are pinned by commit SHA; workflows declare least-privilege `permissions:`; Dependabot updates `npm`/`github-actions` weekly; CI gates production dependencies with `npm audit --omit=dev --audit-level=high`; the wiki token is never in the clone URL (`BR-PLAT-002`).

## How to report a vulnerability

**Do not open a public issue** for security vulnerabilities.

Instead, report privately:

- Preferably, use this repository's **[Security] Report a vulnerability** tab on GitHub (Security Advisories), if available; or
- Send an email to the maintainer with the details (see the [@thepaneb](https://github.com/thepaneb) profile for contact).

When reporting, include whenever possible:

- Description of the vulnerability and potential impact
- Steps to reproduce (configuration used, operating system, extension and VS Code versions)
- Proof of concept, if applicable
- If you know one, a suggested fix or mitigation

## What to expect

- **Acknowledgement of receipt**: within 5 business days.
- **Initial assessment**: we will let you know whether the report was accepted as a vulnerability within 10 business days.
- **Fix**: for confirmed vulnerabilities, the goal is to ship a fix to the Marketplace as soon as possible, depending on severity and complexity.
- **Disclosure**: we ask that you do not disclose the issue publicly until a fix is available. After the release, we may publish a security advisory (GitHub Security Advisory) crediting the researcher, if desired.

## Best practices for users

While using the extension, we recommend:

- Not opening workspaces of unknown origin with `utplsql.*` settings already defined without reviewing `.vscode/settings.json` first.
- Avoiding storing Oracle passwords in plain text in versioned configuration files; prefer environment variables or secret vaults when possible.
- Keeping the **Oracle driver (node-oracledb)** up to date, since vulnerabilities in that dependency also affect the overall attack surface.

Thank you for helping keep utPLSQL Test Runner safe for everyone! 🔒
