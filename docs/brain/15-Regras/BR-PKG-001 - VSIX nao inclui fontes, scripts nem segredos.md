---
id: BR-PKG-001
aliases: [BR-PKG-001]
tipo: regra
titulo: VSIX não inclui fontes, scripts nem segredos (higiene do .vscodeignore)
dominio: empacotamento
status: ativo
severidade: media
interno: true
fonte: codigo
verificado: 2026-10-09
implementacao: [".vscodeignore"]
testes: ["src/test/unit/vsixIgnore.test.ts"]
prds: ["PRD-83"]
relacionado: ["[[ADR-004 - Bundling com esbuild e higiene do VSIX]]", "[[DEP-vsce]]", "[[TPL-ESBUILD - esbuild (bundling do VSIX)]]"]
tags: ["empacotamento"]
---
## Enunciado

O `.vsix` publicado contém apenas `dist/`, o `node_modules` de runtime (com a glue
do `oracledb`), o manifesto, os `package.nls.*` e as imagens — **nunca** `src/`,
`scripts/`, `out/`, `.env*`, `docs/`, `site/` ou artefatos de agente. O
`.vscodeignore` é a fonte da verdade e há teste que o verifica.

## Pré-condições

`.vscodeignore`; `npm run package` / `package:target`.

## Exceções

`node_modules/oracledb/build/**/*.txt` mantém as glues thick `.node` no VSIX.

## Justificativa

Evita vazar código-fonte/segredos e reduz o tamanho do pacote (PRD-83).

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - Regras]]
- 📄 PRDs: [[prd-83-vsix-package-hygiene|PRD-83]]
- 🧩 Código: [[COD - .vscodeignore]]
- 🧪 Testes: [[TST - vsixIgnore.test.ts]]
- 🔗 [[ADR-004 - Bundling com esbuild e higiene do VSIX]] · [[DEP-vsce]] · [[TPL-ESBUILD - esbuild (bundling do VSIX)]]
- ↩️ Referenciada por: [[10-development-tooling]] · [[DEP-vsce]] · [[TPL-ESBUILD - esbuild (bundling do VSIX)|TPL-ESBUILD]] · [[prd-83-vsix-package-hygiene|PRD-83]]
<!-- brain:auto:end -->
