---
tipo: moc
status: ativo
verificado: 2026-09-23
tags: [moc, projeto]
---

# MOC - vscode-utplsql

Extensão VSCode para testes **utPLSQL** (Oracle PL/SQL). Execução via Oracle direto
(node-oracledb, streaming), Test Explorer nativo, cobertura visual, CodeLens, status bar.

## Contexto do repositório

- [README](../../../README.md) — visão do usuário, config, comandos
- [CHANGELOG](../../../CHANGELOG.md) — histórico de versões
- [CONTRIBUTING](../../../CONTRIBUTING.md)
- `AGENTS.md` e `DEVELOPMENT.md` — guias locais de dev (gitignored, não versionados)

## Áreas

- [[MOC - Documentacao]] — mapa de README/variantes, wiki, functional, PRDs
- [[MOC - Funcional]] — especificação funcional (docs/functional/)
- [[MOC - Arquitetura]] — módulos, fluxo de execução, context keys
- [[MOC - Oracle]] — oracledb, conexão, schema, buffer
- [[MOC - Testes]] — unit (node --test), integração, cobertura c8
- [[MOC - PRDs]] — fonte da verdade de features
- [[MOC - Decisoes]] — por que decidimos X
- [[MOC - Bugs]] — diário de diagnóstico
- [[MOC - Snippets]] — comandos e queries reutilizáveis

## Server / repositório remoto

- GitHub: `thepaneb/vscode-utplsql` (remote `origin`)

## Publicação

- **Exclusivamente via GitHub release** (workflow `publish.yml`).
- Local: `npm run package` → `.vsix`.
