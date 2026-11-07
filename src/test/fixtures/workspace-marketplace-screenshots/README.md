# Marketplace screenshots workspace

Demo workspace used **only** by the manual Marketplace capture checklist
(`docs/brain/60-README/Checklist - captura do Marketplace.md`).

- Schema: `DEMO` (fictional data; no customer/host/credential).
- Packages: `orders.pkb` (source under coverage), `ut_orders.pks` (one
  intentional failure for the expected/actual screenshot) and
  `ut_customers.pks`.
- `ut_orders` also has a `%disabled` test to show annotations.
- Connection: configure a demo profile or `UTPLSQL_CONN`; do **not** commit a
  password/settings with credentials.

Open this folder in the Extension Development Host, run the suite once, then
follow the capture checklist.

## Perfil de conexão

- `connection`: `DEMO@//localhost:1521/freepdb1` (sem senha)
- `sourcePath`: `db`; `coverageOwner`: `DEMO`; `includePatterns`: `["db/**/*.pks"]`
- A senha do demo (`demo#2026`) fica no SecretStorage, nunca no repositório.
- Grants e packages de demo estão descritos no checklist do vault.
