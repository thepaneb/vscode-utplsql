---
tipo: moc
status: ativo
modulo: funcional
tags: [moc, funcional, spec]
---

# MOC - Funcional

Especificação funcional da extensão. Fonte da verdade em
[docs/functional/README.md](../../functional/README.md) — **não duplique**, linke.

Fluxo de alto nível:

```
discovery (.pks + banco)  ──►  executeRun  ──►  Oracle direto  ──►  parseJUnit  ──►  Test Explorer
                                       │                                      │
                                       └─►  parseCobertura  ──►  Coverage gutters
```

## Índice (gerado)

<!-- brain:auto:start:funcional-index -->
| # | Documento | Descrição |
|---|---|---|
| 01 | [Test Discovery](../../functional/01-test-discovery.md) | Como suites e testes são descobertos nos arquivos `.pks` |
| 02 | [Test Execution](../../functional/02-test-execution.md) | Execução (Oracle streaming), cancelamento |
| 03 | [Results and Reporting](../../functional/03-results-and-reporting.md) | Parse JUnit, mapping resultado→TestItem, reporters |
| 04 | [Code Coverage](../../functional/04-code-coverage.md) | Parse Cobertura, source mapping, grants |
| 05 | [UX Components](../../functional/05-ux-components.md) | CodeLens, StatusBar, Decorations, Keybindings |
| 06 | [Tree Organization](../../functional/06-tree-organization.md) | Modos file/schema, extração de schema |
| 07 | [Diagnostics and Validation](../../functional/07-diagnostics-and-validation.md) | Compilação PL/SQL, setup validation, quick-fix |
| 08 | [Jump to Failure](../../functional/08-jump-to-failure.md) | Stack trace parse, message.location, Go to Error |
| 09 | [Configuration](../../functional/09-configuration.md) | Settings, conexão, env vars, segurança |
| 10 | [Development Tooling](../../functional/10-development-tooling.md) | TS coverage, CI, PRDs, stub de testes |
| 11 | [PL/SQL Debugger](../../functional/11-debugger.md) | Debug de testes via `DBMS_DEBUG` (DAP `utplsql`) |
<!-- brain:auto:end -->

_As descrições são espelhadas de [docs/functional/README.md](../../functional/README.md)
(fonte da verdade). Regenerar: `npm run brain:sync`._

## Camadas (alto nível)

Não duplicado aqui: ver a seção **"Arquitetura de alto nível"** em
[docs/functional/README.md](../../functional/README.md).

## Relacionado

- [[MOC - Arquitetura]]
- [[MOC - Oracle]]
- [[MOC - Testes]]
- [[MOC - vscode-utplsql]]
