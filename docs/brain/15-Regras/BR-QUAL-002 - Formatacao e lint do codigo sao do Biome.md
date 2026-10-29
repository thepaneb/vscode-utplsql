---
id: BR-QUAL-002
aliases: [BR-QUAL-002]
tipo: regra
titulo: Formatação e lint do código são do Biome (fonte da verdade)
dominio: qualidade
status: ativo
severidade: baixa
interno: true
fonte: codigo
verificado: 2026-10-29
implementacao: ["biome.json", "package.json"]
testes: ["src/test/unit/lintScope.test.ts"]
prds: ["PRD-113"]
requisitos: ["PRD-113/RF1", "PRD-113/RF2"]
relacionado: ["[[ADR-013 - Consolidacao das ferramentas de desenvolvimento (0.13.0)]]", "[[TPL-BIOME - Biome (lint e formatação)]]", "[[DEP-biome]]"]
tags: ["qualidade"]
---
## Enunciado

Todo o repositório (não só `src/**`) segue `biome.json`: indent 2,
`lineWidth 100`, `quoteStyle single`, `semicolons always`, `trailingCommas all`
e `organizeImports` on; linter preset `recommended` (exceção: `noExplicitAny`
off em `src/test/**`). `npm run lint` é **`biome check .`** e cobre manifestos
(`package.json`, `package.nls*.json`), configs (`*.mjs`, `.vscode/*.json`) e
`scripts/**`; ficam de fora apenas gerados/vendorizados (`docs`, `site`,
`out`, `dist`, `coverage`, `.vscode-test`, `.agents`, `.opencode`, `.kilo`,
`package-lock.json`, `skills-lock.json`). Verificado no `pretest:unit` e no CI.

## Pré-condições

`biome.json`; `@biomejs/biome`.

## Justificativa

Fonte única de lint+formatação (ADR-013), sem ESLint/Prettier separados; mantém o
diff e o estilo previsíveis.

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - Regras]]
- 📄 PRDs: [[prd-113-lint-scope|PRD-113]]
- 🎯 Requisitos: [[prd-113-lint-scope|PRD-113 RF1]] · [[prd-113-lint-scope|PRD-113 RF2]]
- 🧩 Código: [[COD - biome.json]] · [[COD - package.json]]
- 🧪 Testes: [[TST - lintScope.test.ts]]
- 🔗 [[ADR-013 - Consolidacao das ferramentas de desenvolvimento (0.13.0)]] · [[TPL-BIOME - Biome (lint e formatação)]] · [[DEP-biome]]
- ↩️ Referenciada por: [[10-development-tooling]] · [[Contributing]] · [[TPL-BIOME - Biome (lint e formatação)|TPL-BIOME]] · [[prd-113-lint-scope|PRD-113]]
<!-- brain:auto:end -->
