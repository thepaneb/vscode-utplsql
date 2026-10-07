---
tipo: prd
id: PRD-97
aliases: [PRD-97]
status: proposed
titulo: "Documentação no site (Fase 2 da PRD-96)"
versao: "0.16.0"
data: "2026-10-07"
autor: "Gil Cleber"
verificado: 2026-10-07
regras: []
tags: [prd]
---

# PRD-97 — Documentação no site (Fase 2 da PRD-96)

| Campo | Valor |
|---|---|
| Autor | Gil Cleber |
| Data | 2026-10-07 |
| Componente | Site público (`site/`) |
| Versão alvo | 0.16.0 |
| Arquivos afetados | `scripts/brain-build.cjs`, `site/**`, `docs/brain/70-Wiki/**`, `.github/workflows/pages.yml` |
| Esforço estimado | 2–3 dias |
| Complexidade | Média |

## 1. Resumo

Segunda fase da PRD-96: levar a **documentação completa** para dentro do site
público. Hoje a landing page existe, mas as **26 páginas** de `docs/wiki/`
continuam só no GitHub Wiki — que é `noindex` e portanto não aparece em
buscadores. Esta PRD porta essas páginas para `site/docs/`, reescreve os links
(formato wiki → web), gera o `sitemap.xml` completo e avalia `hreflang`.

## 2. Contexto e problema

A PRD-96 entregou a landing page indexável, mas o conteúdo profundo (instalação,
conexão, cobertura, debugger, configuração…) permanece invisível: o GitHub
responde `x-robots-tag: none` nas páginas do Wiki. Sem portar a doc, o site
indexa apenas uma URL e a maior parte do material do projeto segue fora do
Google/Bing.

Os arquivos em `docs/wiki/**` são **gerados** do vault (`70-Wiki`) com links no
formato `[Texto](Pagina)` (sem `.md`), pensados para o Wiki — não funcionam como
estão num site estático.

## 3. Objetivos / Não-objetivos

**Objetivos**
- Publicar `docs/wiki/**` como `site/docs/**`, renderizados como páginas
  navegáveis, a partir da mesma fonte (vault `70-Wiki`)
- Reescrever links wiki → web (incl. `_Sidebar`) e gerar índice/navegação
- `sitemap.xml` completo (uma `<loc>` por página) e `lastmod`
- Avaliar `hreflang` reaproveitando os 23 READMEs de idioma
- Manter a governança: `docs:check` valida o site inteiro; `brain:gaps` idem

**Não-objetivos**
- Domínio próprio (fase 3, opcional)
- Reescrever o conteúdo da doc (só portar; o vault continua canônico)
- Traduzir as páginas de doc (apenas `hreflang` a partir dos READMEs)

## 4. Requisitos

### RF1 — Portar `docs/wiki/**` para `site/docs/**`

As 26 páginas (menos `_Sidebar`) viram páginas do site, geradas do vault (mesma
fonte que alimenta o Wiki), com um layout comum (navegação lateral + topo).

### RF2 — Reescrita de links wiki → web

Converter os links `[Texto](Pagina)` para caminhos relativos do site
(`docs/Pagina.html`), resolver a `_Sidebar` como navegação e o `README` como home.

### RF3 — Sitemap completo

`sitemap.xml` com todas as páginas (home + docs), com `lastmod`.

### RF4 — `hreflang` (avaliar)

Usar os 23 READMEs de idioma para `hreflang`/`x-default`; decidir se vale a pena
por página ou só na home.

### RF5 — Decisão sobre o GitHub Wiki

Manter o Wiki (`noindex`, arquivo) ou aposentar a publicação, com a doc pública
passando a ser o site. Se mantiver, apontar `canonical` do Wiki para o site.

**Não-funcionais**
- RNF1 — Nenhuma página do site entra no VSIX (`.vscodeignore` cobre `site/**`)
- RNF2 — `brain:ci` + `docs:check` verdes; `docs/wiki/**` continua íntegro
- RNF3 — Lighthouse mobile ≥ 90 nas páginas de doc

## 5. Solução proposta

- **Geração**: alvo de publicação no `brain:build` que renderiza Markdown →
  HTML a partir das notas `70-Wiki` (ou migrar para um SSG — Jekyll/Astro — se a
  reescrita de links ficar custosa; ver PRD-96 §5.3).
- **Estrutura**: `site/docs/<slug>.html` + `site/docs/_nav.html` (da `_Sidebar`).
- **Links**: etapa de reescrita no `brain:build` (regex dos links wiki → relativos).
- **Sitemap**: gerar do conjunto de páginas publicadas.

## 6. Configuração

Nenhuma setting/comando novo. `pages.yml` passa a publicar também `site/docs/**`
(já coberto por `site/**`).

## 7. Plano de testes

- **Unitários**: reescrita de links e geração de sitemap (funções puras no
  `brain-build`/`docs-check`).
- **CI**: `docs:check` valida cada página (title/canonical/h1) e o sitemap.
- **SEO**: Rich Results/Lighthouse por amostra; conferir indexação de algumas páginas.
- **Regressão**: `npm run brain:ci`, `npm run docs:check`.

## 8. Riscos e mitigação

| Risco | Mitigação |
|---|---|
| Links wiki quebrarem na conversão | testes unitários da reescrita + `docs:check` de links locais |
| Conteúdo duplicado Wiki ↔ site | `canonical` (site) ou aposentar o Wiki (RF5) |
| Crescimento da banda (>100 GB/mês soft) | conteúdo leve; SSG estático; CDN se preciso |
| Portar a doc virar reescrita | manter o vault canônico e só transformar no build |

## 9. Rollout

- 0.16.0: portar `docs/wiki/**` + sitemap completo; decidir `hreflang`/Wiki.
- Entry no `CHANGELOG.md`; regra nova (proposta: `BR-SITE-002`) na conclusão.

## 10. Critérios de aceite

- [ ] `site/docs/**` com as páginas da doc, navegáveis e sem links quebrados
- [ ] `sitemap.xml` lista home + todas as páginas
- [ ] `docs:check` valida cada página (title/canonical/h1) e o sitemap
- [ ] `brain:ci` + `docs:check` verdes; `brain:gaps` cobre `site/**`
- [ ] Decisão sobre o Wiki registrada (manter com `canonical` ou aposentar)

## 11. Questões em aberto

- Markdown→HTML próprio vs SSG (Jekyll/Astro)?
- `hreflang` por página ou só na home?
- Busca no site (Pagefind/Lunr)?

## 12. Impacto no cérebro

PRD proposta. Na conclusão deve materializar uma regra de implementação
(proposta: `BR-SITE-002` — doc do projeto publicada no site, links reescritos e
sitemap completo) e atualizar a `BR-SITE-001`. `regras:` é derivado pelo
`brain:sync`. Por ora: **nenhuma**.

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - PRDs]]
- 🔗 PRDs relacionados: [[prd-96-public-landing-page-github-pages|PRD-96]]
- ⚙️ Pipelines: [[PIPE-pages - Deploy Pages|PIPE-pages]]
- 🚀 ⬅️ release anterior: [[prd-96-public-landing-page-github-pages|PRD-96 (0.15.0)]] · ➡️ próxima release: [[prd-56-duration-persistence|PRD-56 (0.17.0)]]
<!-- brain:auto:end -->
