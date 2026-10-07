---
id: BR-SITE-001
aliases: [BR-SITE-001]
tipo: regra
titulo: Landing page gerada de site/ e publicada no GitHub Pages, sem noindex
dominio: site
status: ativo
severidade: baixa
fonte: prd
interno: true
verificado: 2026-10-07
implementacao: ["scripts/brain-build.cjs", "scripts/docs-check.cjs", "scripts/brain-gaps.cjs", ".github/workflows/pages.yml", "site/index.html", "site/robots.txt", "site/sitemap.xml"]
testes: ["src/test/unit/brainBuild.test.ts", "src/test/unit/vsixIgnore.test.ts"]
prds: ["PRD-96"]
requisitos: ["PRD-96/RNF1", "PRD-96/RNF2", "PRD-96/RNF3", "PRD-96/RNF4"]
tags: ["site", "seo", "publicacao"]
---

# BR-SITE-001 — Landing page gerada de site/ e publicada no GitHub Pages, sem noindex

## Enunciado

A landing page pública vive em `site/` e é **gerada** por `npm run brain:build` a
partir da nota `80-Site/Landing page (site)` (`publicar: site/index.html`),
resolvendo os tokens `{{VERSION}}` (de `package.json`) e `{{SITE_URL}}`; o
`pages.yml` publica `site/` no **GitHub Pages** via Actions. O site é
**indexável** — não emite `noindex`/`x-robots-tag: none` — e traz `title`,
`meta description`, `canonical`, Open Graph e JSON-LD `SoftwareApplication`,
além de `robots.txt` e `sitemap.xml`. O `docs:check` (seção “Site (GitHub
Pages)”) valida esses itens, os links locais e a versão; o `brain:gaps` cobre
`site/**`; e `site/**` fica fora do VSIX (`.vscodeignore`).

## Pré-condições

Pages habilitado com **Source = GitHub Actions**; o deploy usa o environment
`github-pages`, que publica apenas da branch padrão (`main`).

## Exceções

Domínio próprio, a documentação completa dentro do site e a decisão sobre o Wiki
são fases posteriores (PRD-97). O `robots.txt` do subcaminho do projeto é
ignorado pelo Googlebot (só vale na raiz do host); o envio do sitemap é feito no
Search Console.

## Justificativa

O considerável conteúdo de `docs/wiki/` é `noindex` por decisão do GitHub; o
Pages dá ao projeto uma superfície pública **indexável** e sob controle
(title/meta/canonical/structured data), sem dependências de runtime.

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - Regras]]
- 📄 PRDs: [[prd-96-public-landing-page-github-pages|PRD-96]]
- 🎯 Requisitos: [[prd-96-public-landing-page-github-pages|PRD-96 RNF1]] · [[prd-96-public-landing-page-github-pages|PRD-96 RNF2]] · [[prd-96-public-landing-page-github-pages|PRD-96 RNF3]] · [[prd-96-public-landing-page-github-pages|PRD-96 RNF4]]
- 🧩 Código: [[COD - brain-build.cjs]] · [[COD - docs-check.cjs]] · [[COD - brain-gaps.cjs]] · [[COD - pages.yml]] · [[COD - index.html]] · [[COD - robots.txt]] · [[COD - sitemap.xml]]
- 🧪 Testes: [[TST - brainBuild.test.ts]] · [[TST - vsixIgnore.test.ts]]
- ↩️ Referenciada por: [[10-development-tooling]] · [[prd-96-public-landing-page-github-pages|PRD-96]]
<!-- brain:auto:end -->
