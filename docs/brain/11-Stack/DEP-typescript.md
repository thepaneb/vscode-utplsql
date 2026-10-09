---
id: DEP-typescript
aliases: [DEP-typescript]
tipo: dependencia
status: ativo
titulo: "typescript"
nome: typescript
versao: "^7.0.2"
escopo: dev
licenca: Apache-2.0
criticidade: alta
risco: "Major 7 (mudanças de comportamento); alvo ES2021/node16"
alternativas: []
tags: [dependencia, dev, build]
---

# DEP-typescript — typescript

## Papel no projeto

Compila `src/**` para `out/**` (`tsc -p ./`) — usado pelos testes `node --test`.
O `dist/extension.js` publicado é gerado pelo **esbuild** (não pelo `tsc`).

## Riscos

- **TypeScript 7** (major recente): mudanças de inferência/config; manter o
  `tsconfig` enxuto.
- Alvo `ES2021`/`node16` (CommonJS) — o bundle do esbuild usa `node22`.

## Alternativas

- Nenhuma prática (padrão do ecossistema VSCode).

## Referências

- `package.json` · `tsconfig.json` · `esbuild.config.mjs`
