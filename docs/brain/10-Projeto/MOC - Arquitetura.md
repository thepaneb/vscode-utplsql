---
tipo: moc
status: ativo
verificado: 2026-09-23
modulo: core
tags: [moc, arquitetura]
---

# MOC - Arquitetura

## Orquestrador e execução

- `extension.ts` é o orquestrador.
- `runner.ts` contém `executeRun`.
- `oracleRunner.ts` contém `executeRunOracle`.
- `results.ts` contém as funções canônicas: `applyResultsFromCases`,
  `applyCoverageFromXml`, `countResults`, `resolveStackFrameToUri`.

Fluxo Oracle direto:

```
Oracle: conn1 → ut_runner.run(...) bloqueante
        conn2 → poll UT_OUTPUT_BUFFER_TMP 200ms → doc (real-time) + XML (final)
```

## Módulos: puros vs vscode

| Puro (`node --test`) | Depende de `vscode` |
|---|---|
| `suiteParser.ts`, `junit.ts`, `cobertura.ts` | `extension.ts`, `runner.ts`, `config.ts` |
| `matching.ts` | `discovery.ts`, `coverage.ts` |
| `codelens.ts` (parse), `state.ts`, `types.ts` | `decorations.ts`, `statusBar.ts`, `oracleRunner.ts`, `results.ts` |

> `parseCodeLensItems` é usado em **3 lugares**: CodeLens, Decorations, Run at Cursor.

## Context keys

| Key | Setado em | Quando |
|---|---|---|
| `utplsql:activated` | `extension.ts` | sempre |
| `utplsql:running` | `runner.ts` | início/fim da execução |
| `utplsql:connected` | `config.ts` | ao resolver/limpar conexão |
| `utplsql:hasFailures` | `runner.ts` | `lastFailedItems.length > 0` |

## Schema-mode

- `doRefresh()` bifurca → `buildFileTree` ou `buildSchemaTree` (`cfg.organization`).
- `state.suiteMap`: mapa `id → TestItem`. **Use sempre** `state.getSuiteItem()`.
- `collectAllItems`: percorre até 3 níveis no modo schema.
- `extractSchemaFromPath`: usa `path.posix.relative`. Placeholder `{schema}` → `([^/]+)`.

## Documentação no repo

- [wiki/Architecture](../../../docs/wiki/Architecture.md)
- [functional/05-ux-components](../../../docs/functional/05-ux-components.md)
- [functional/06-tree-organization](../../../docs/functional/06-tree-organization.md)

## Decisões relacionadas

```dataview
LIST FROM "30-Decisoes" WHERE modulo = "core" OR modulo = "arquitetura" SORT file.mtime DESC
```
