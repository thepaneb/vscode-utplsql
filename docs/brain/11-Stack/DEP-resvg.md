---
id: DEP-resvg
aliases: [DEP-resvg]
tipo: dependencia
status: ativo
titulo: "@resvg/resvg-js"
nome: "@resvg/resvg-js"
versao: "^2.6.2"
escopo: dev
licenca: MPL-2.0
criticidade: baixa
risco: "Binário nativo por plataforma (só dev/geração de assets)"
alternativas: [sharp]
tags: [dependencia, dev, assets]
---

# DEP-resvg — @resvg/resvg-js

## Papel no projeto

Renderiza SVG → PNG para **ícone e diagramas** (`scripts/gen-icon.cjs`,
`scripts/gen-diagrams.cjs`). Só desenvolvimento; não vai no `.vsix`.

## Riscos

- Binário nativo por plataforma (MPL-2.0); falha em plataforma sem build.

## Alternativas

- sharp — não adotado.

## Referências

- `package.json` · `scripts/gen-icon.cjs` · `scripts/gen-diagrams.cjs`
