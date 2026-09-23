---
tipo: moc
status: ativo
verificado: 2026-09-23
tags: [moc, componentes, terceiros]
---

# MOC - Componentes de Terceiros

Análise **curada** (`TPL-*`) de bibliotecas/plataformas externas das quais o
projeto depende: papel, licença, criticidade, risco, alternativas e plano de
upgrade. Fatos como versão/licença vêm de `package.json` (`brain:sync`).

## Como criar

Nova nota em `17-Componentes/` com nome `TPL-<NOME>.md` (template `componente`).

## Todos os componentes

```dataview
TABLE fornecedor, licenca, criticidade, risco
FROM "17-Componentes"
WHERE tipo = "componente-terceiro"
SORT id ASC
```

## Índice (links)

<!-- brain:auto:start:moc-index -->
- [[TPL-BIOME - Biome (lint e formatação)]] — `TPL-BIOME`
- [[TPL-C8 - c8 (cobertura TypeScript)]] — `TPL-C8`
- [[TPL-ESBUILD - esbuild (bundling do VSIX)]] — `TPL-ESBUILD`
- [[TPL-FASTXML - fast-xml-parser]] — `TPL-FASTXML`
- [[TPL-ORACLEDB - node-oracledb]] — `TPL-ORACLEDB`
- [[TPL-UTPLSQL - utPLSQL (framework no banco)]] — `TPL-UTPLSQL`
- [[TPL-VSCODE-TEST-API - VSCode Test API (Test Explorer)]] — `TPL-VSCODE-TEST-API`
<!-- brain:auto:end -->
