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
verificado: 2026-10-09
implementacao: ["biome.json"]
testes: []
relacionado: ["[[ADR-013 - Consolidacao das ferramentas de desenvolvimento (0.13.0)]]", "[[TPL-BIOME - Biome (lint e formatação)]]", "[[DEP-biome]]"]
tags: ["qualidade"]
---
## Enunciado

`src/**` segue `biome.json`: indent 2, `lineWidth 100`, `quoteStyle single`,
`semicolons always`, `trailingCommas all` e `organizeImports` on; linter preset
`recommended` (exceção: `noExplicitAny` off em `src/test/**`). Verificado por
`npm run lint` (no `pretest:unit` e no CI).

## Pré-condições

`biome.json`; `@biomejs/biome`.

## Justificativa

Fonte única de lint+formatação (ADR-013), sem ESLint/Prettier separados; mantém o
diff e o estilo previsíveis.

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - Regras]]
- 🧩 Código: [[COD - biome.json]]
- 🔗 [[ADR-013 - Consolidacao das ferramentas de desenvolvimento (0.13.0)]] · [[TPL-BIOME - Biome (lint e formatação)]] · [[DEP-biome]]
- ↩️ Referenciada por: [[10-development-tooling]] · [[TPL-BIOME - Biome (lint e formatação)|TPL-BIOME]]
<!-- brain:auto:end -->
