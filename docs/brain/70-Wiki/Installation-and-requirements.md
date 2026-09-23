---
tipo: wiki
status: ativo
titulo: "Installation and Requirements"
publicar: docs/wiki/Installation-and-requirements.md
verificado: 2026-09-23
tags: [wiki]
---

# Installation and Requirements

## Installation

The extension can be installed in two ways:

### 1. From the Marketplace

Search for **utPLSQL Test Runner** in the VSCode Extensions panel
(`Ctrl+Shift+X`) and click **Install**.

![VSCode Marketplace with utPLSQL Test Runner search](images/marketplace-card.png)

### 2. Manually (.vsix)

Download the `.vsix` file from the [releases page](https://github.com/thepaneb/vscode-utplsql/releases)
and install:

**Command line:**
```bash
code --install-extension vscode-utplsql-0.13.0.vsix
```

**UI:** Extensions Panel (`Ctrl+Shift+X`) → `...` (top-right corner)
→ **Install from VSIX...**

![Install from VSIX option in the extensions panel](images/install-from-vsix.png)

## Requirements

### Database

- [**utPLSQL**](https://github.com/utPLSQL/utPLSQL) **(UT3)** installed on the Oracle database.

To verify whether utPLSQL is installed:
```sql
SELECT ut_meta.version() FROM dual;
-- should return something like: v3.2.3
```

### Local machine

- **VSCode 1.88+** (required by the Test Coverage API).
- Nothing else — the VSIX already includes the `oracledb` thin driver (no Instant Client needed). For databases with **NNE**, opt into thick mode with a local Oracle Instant Client via `utplsql.oracleClientMode`/`utplsql.oracleClientLibDir`.

### Compatibility

| Oracle | utPLSQL | VSCode | Extension |
|---|---|---|---|
| 18c+ | v3.1.x / v3.2.0+ | 1.88+ | 0.3.0+ |
| 12.2 | v3.1.x only | 1.88+ | 0.13.0+ |

> **Oracle 12.2:** utPLSQL **v3.2.x does not compile** on 12.2
> (`PLS-00222` in `UT_ANNOTATION_MANAGER`; it requires an 18c+ feature). Use
> **v3.1.x**. Also, the 12.2 image ships a `WE8DEC` database character set,
> which loses characters outside it (e.g. `€` → `¿`); prefer `AL32UTF8`.

> The extension is just the GUI client — tests are executed by the Oracle
> database, via node-oracledb (thin driver, or thick when configured).
