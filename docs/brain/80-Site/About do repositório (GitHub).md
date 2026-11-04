---
tipo: guia
status: ativo
titulo: "About do repositório (GitHub)"
verificado: 2026-11-04
descricao: "Run, debug and cover utPLSQL (Oracle PL/SQL) tests in VS Code's native Test Explorer — visual coverage, jump-to-failure, DBMS_DEBUG debugger, tags/random order, connection profiles and Oracle-direct execution via node-oracledb (thin & thick). 24 UI languages; requires VS Code 1.125+ (Node 24)."
homepage: "https://thepaneb.github.io/vscode-utplsql/"
topics: [code-coverage, coverage, debugger, i18n, node-oracledb, oracle, oracle-database, plsql, plsql-debugger, test-explorer, testing, typescript, unit-testing, utplsql, vscode, vscode-extension]
implementacao: ["scripts/github-about.cjs"]
testes: ["src/test/unit/githubAbout.test.ts"]
tags: [github, about, drift, docs]
---

# About do repositório (GitHub)

Fonte canônica da **descrição**, **homepage** e **tópicos** da seção *About* do
repositório no GitHub. Esses campos não são versionados pelo GitHub, então o
`docs:check` não os vê; o script abaixo compara a nota com a API e aplica a
correção quando pedido.

```sh
npm run about:check   # falha se o About do GitHub divergir desta nota
npm run about:apply   # aplica descrição/homepage/tópicos no GitHub
```

- `about:check` roda no `ci.yml` (Node 24) e falha apenas em **divergência
  confirmada**; falha de rede/API é aviso, não quebra o build.
- `about:apply` precisa de `GITHUB_TOKEN` (env ou `.env`) com permissão de
  administração do repositório.

## Conexões

- 🌐 [[Landing page (site)]]
- 🗺️ [[MOC - Stack]]
