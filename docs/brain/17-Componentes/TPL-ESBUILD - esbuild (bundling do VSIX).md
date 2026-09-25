---
id: TPL-ESBUILD
aliases: [TPL-ESBUILD]
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
relacionado: ["[[ADR-004 - Bundling com esbuild e higiene do VSIX]]"]
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
- 🔗 [[ADR-004 - Bundling com esbuild e higiene do VSIX]]
- ↩️ Referenciada por: [[NFR-002 - Compatibilidade com Node|NFR-002]]
<!-- brain:auto:end -->
