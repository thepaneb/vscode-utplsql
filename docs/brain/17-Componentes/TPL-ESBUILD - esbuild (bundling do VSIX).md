---
id: TPL-ESBUILD
tipo: componente-terceiro
titulo: "esbuild (bundling do VSIX)"
dominio: build
fornecedor: esbuild
licenca: MIT
criticidade: alta
risco: baixo
versao: "^0.28.2"
url: https://esbuild.github.io
status: ativo
verificado: 2026-09-23
implementacao: []
testes: []
regras: []
tags: ["build"]
---
## Papel

Empacota `src/extension.ts` → `dist/extension.js` e poda o `node-oracledb` no VSIX
(PRD-45), reduzindo o tamanho do pacote.

## Riscos

Externals mal configurados podem quebrar o runtime; `node-oracledb` não deve ser
bundlado.

## Upgrade/saída

Config em `esbuild.config.mjs`.

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - Componentes]]
<!-- brain:auto:end -->
