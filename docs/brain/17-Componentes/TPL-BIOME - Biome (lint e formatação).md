---
id: TPL-BIOME
tipo: componente-terceiro
titulo: "Biome (lint e formatação)"
dominio: tooling
fornecedor: Biome
licenca: MIT OR Apache-2.0
criticidade: media
risco: baixo
versao: "^2.5.2"
url: https://biomejs.dev
status: ativo
verificado: 2026-09-23
implementacao: []
testes: []
regras: []
tags: ["tooling"]
---
## Papel

Linter e formatter (`npm run lint` / `lint:fix`): indent 2, lineWidth 100,
single quotes, semicolons, trailing commas, organizeImports.

## Riscos

Regras novas em majors podem exigir ajustes; roda no CI.

## Upgrade/saída

Config em `biome.json`; alternativas: ESLint+Prettier (mais pesadas).
