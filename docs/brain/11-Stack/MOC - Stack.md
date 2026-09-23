---
tipo: moc
status: ativo
tags: [moc, stack, dependencias]
---

# MOC - Stack e Dependências

Stack e dependências são **fatos do código** (geradas), não texto escrito à mão —
evita drift. Inventário e versões vêm de `package.json`, `.nvmrc`, `tsconfig.json`
e `biome.json` via `npm run brain:sync`. Notas curadas (`DEP-*`) explicam o papel
e os riscos das dependências **diretas** relevantes.

## Stack (gerado)

<!-- brain:auto:start:stack -->
- **Node (engines):** >=22.0.0
- **VSCode (engines):** ^1.88.0
- **.nvmrc:** 24
- **TypeScript:** ES2021 / node16
- **Biome:** lineWidth 100, single
- **Empacotamento:** ./dist/extension.js
<!-- brain:auto:end -->

## Dependências diretas (gerado)

<!-- brain:auto:start:deps -->
**Runtime (2)**

- `fast-xml-parser` `^5.11.1` — runtime
- `oracledb` `^7.0.1` — runtime

**Desenvolvimento (12)**

- `@biomejs/biome` `^2.5.2` — dev
- `@resvg/resvg-js` `^2.6.2` — dev
- `@types/mocha` `^10.0.7` — dev
- `@types/node` `^22.20.1` — dev
- `@types/oracledb` `^7.0.2` — dev
- `@types/vscode` `^1.88.0` — dev
- `@vscode/test-cli` `^0.0.15` — dev
- `@vscode/test-electron` `^3.1.0` — dev
- `@vscode/vsce` `^3.2.1` — dev
- `c8` `^12.0.0` — dev
- `esbuild` `^0.28.2` — dev
- `typescript` `^7.0.2` — dev
<!-- brain:auto:end -->

## Notas curadas

```dataview
TABLE escopo, versao, criticidade, risco
FROM "11-Stack"
WHERE tipo = "dependencia"
SORT id ASC
```

## Pipelines de CI (gerado)

Notas `PIPE-*` geradas dos workflows em `.github/workflows/` (`npm run brain:sync`).

```dataview
TABLE arquivo, gatilhos, jobs
FROM "11-Stack"
WHERE tipo = "pipeline"
SORT id ASC
```
