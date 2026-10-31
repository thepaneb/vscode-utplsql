---
id: BR-PLAT-005
aliases: [BR-PLAT-005]
tipo: regra
titulo: Bundle de produção é ESM (.mjs) e os testes continuam CJS
dominio: plataforma
status: ativo
severidade: alta
interno: true
fonte: codigo
verificado: 2026-10-31
implementacao: ["esbuild.config.mjs", "package.json", "tsconfig.json", ".vscode/launch.json"]
testes: ["src/test/unit/esbuildConfig.test.ts", "src/test/unit/vsixIgnore.test.ts"]
prds: ["PRD-95"]
requisitos: ["PRD-95/RF1", "PRD-95/RF2", "PRD-95/RNF1", "PRD-95/RNF2", "PRD-95/RNF3", "PRD-95/RNF4"]
relacionado: ["[[ADR-004 - Bundling com esbuild e higiene do VSIX]]", "[[TPL-ESBUILD - esbuild (bundling do VSIX)]]", "[[NFR-002 - Compatibilidade com Node]]"]
tags: ["plataforma", "build"]
---
## Enunciado

O **bundle publicado** é `dist/extension.mjs` (esbuild `format: 'esm'`,
`target: 'node24'`, `vscode`/`oracledb` externos) e o `main` do `package.json`
aponta para ele. O **harness de testes** continua CommonJS: `tsc` emite
`out/**/*.js` com `module: node16` e o `@vscode/test-cli`/Mocha carregam esses
arquivos sem `"type": "module"` no `package.json`.

O bundle limpa `dist/` antes de gerar, para não empacotar um `extension.js`
antigo; o `outFiles` do `launch.json` inclui `dist/**/*.mjs`.

## Pré-condições

Piso VS Code 1.125 / Node 24 (PRD-127) e `@types/vscode` exato no piso.

## Exceções

O `oracledb` (CJS) é carregado por `await import('oracledb')`; o `vscode` é
externo. Não adicionar `"type": "module"` sem migrar os testes para ESM.

## Justificativa

Aproveitar tree-shaking/ES2024 sem quebrar o harness CJS e sem depender do
`type: module` (que reinterpretaria todo o `out/`).

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - Regras]]
- 📄 PRDs: [[prd-95-esm-es2023-node22|PRD-95]]
- 🎯 Requisitos: [[prd-95-esm-es2023-node22|PRD-95 RF1]] · [[prd-95-esm-es2023-node22|PRD-95 RF2]] · [[prd-95-esm-es2023-node22|PRD-95 RNF1]] · [[prd-95-esm-es2023-node22|PRD-95 RNF2]] · [[prd-95-esm-es2023-node22|PRD-95 RNF3]] · [[prd-95-esm-es2023-node22|PRD-95 RNF4]]
- 🧩 Código: [[COD - esbuild.config.mjs]] · [[COD - package.json]] · [[COD - tsconfig.json]] · [[COD - launch.json]]
- 🧪 Testes: [[TST - esbuildConfig.test.ts]] · [[TST - vsixIgnore.test.ts]]
- 🔗 [[ADR-004 - Bundling com esbuild e higiene do VSIX]] · [[TPL-ESBUILD - esbuild (bundling do VSIX)]] · [[NFR-002 - Compatibilidade com Node]]
- ↩️ Referenciada por: [[10-development-tooling]] · [[TPL-ESBUILD - esbuild (bundling do VSIX)|TPL-ESBUILD]] · [[prd-95-esm-es2023-node22|PRD-95]]
<!-- brain:auto:end -->
