---
id: DEP-biome
aliases: [DEP-biome]
tipo: dependencia
status: ativo
titulo: "@biomejs/biome"
nome: "@biomejs/biome"
versao: "^2.5.2"
escopo: dev
licenca: "MIT OR Apache-2.0"
criticidade: media
risco: "Regras `recommended` evoluem entre minors; config versionada"
alternativas: [eslint-prettier]
tags: [dependencia, dev, qualidade]
decisoes: [ADR-013]
---

# DEP-biome — @biomejs/biome

## Papel no projeto

Lint + formatação (`npm run lint`), parte do `pretest:unit`. Config versionada
(`biome.json`): indent 2, `lineWidth 100`, single, semicolons, trailing commas,
`organizeImports`. Exceção: `noExplicitAny` off em `src/test/**`.

## Riscos

- Novas regras `recommended` podem acusar código existente numa atualização.

## Alternativas

- ESLint + Prettier (não adotado — Biome unifica).

## Referências

- `package.json` · `biome.json`

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - Stack]]
- 🧭 Decisões: [[ADR-013 - Consolidacao das ferramentas de desenvolvimento (0.13.0)|ADR-013]]
- ↩️ Referenciada por: [[BR-QUAL-002 - Formatacao e lint do codigo sao do Biome|BR-QUAL-002]]
<!-- brain:auto:end -->
