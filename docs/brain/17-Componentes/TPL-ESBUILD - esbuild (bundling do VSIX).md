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
implementacao: ["esbuild.config.mjs", "package.json"]
testes: []
regras: [BR-PKG-001]
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
- 📐 Regras: [[BR-PKG-001 - VSIX nao inclui fontes, scripts nem segredos|BR-PKG-001]]
- 🧩 Código: [[COD - esbuild.config.mjs]] · [[COD - package.json]]
- 🔗 [[ADR-004 - Bundling com esbuild e higiene do VSIX]]
- ↩️ Referenciada por: [[BR-PKG-001 - VSIX nao inclui fontes, scripts nem segredos|BR-PKG-001]] · [[NFR-002 - Compatibilidade com Node|NFR-002]]
<!-- brain:auto:end -->
