---
tipo: prd
id: PRD-96
aliases: [PRD-96]
status: completed
titulo: "Site público e landing page via GitHub Pages"
versao: "0.15.0"
data: "2026-10-07"
autor: "Gil Cleber"
verificado: 2026-10-07
regras: ["BR-SITE-001"]
tags: [prd]
---

# PRD-96 — Site público e landing page via GitHub Pages

| Campo | Valor |
|---|---|
| Autor | Gil Cleber |
| Data | 2026-10-07 |
| Componente | Projeto (site público) + extensão `paneb.vscode-utplsql` |
| Versão alvo | 0.15.0 |
| Arquivos afetados | `scripts/brain-build.cjs`, `scripts/docs-check.cjs`, `scripts/brain-gaps.cjs`, `.github/workflows/pages.yml`, `site/**`, `docs/brain/80-Site/**`, `.vscodeignore`, `docs/wiki/**` (fase 2) |
| Esforço estimado | 2–4 dias |
| Complexidade | Média |

## 1. Resumo

Publicar um **site estático público** no **GitHub Pages** como landing page do
projeto, com HTML indexável (títulos, meta, `canonical`, Open Graph, JSON-LD,
`sitemap.xml` e `robots.txt`). Hoje a documentação vive no **GitHub Wiki**, que o
GitHub marca com `X-Robots-Tag: none` — ou seja, **invisível para Google/Bing**.
O Pages troca essa superfície por conteúdo indexável e dá uma vitrine própria ao
projeto (hoje só existem o README do repositório e a página do Marketplace).

## 2. Contexto e problema

### 2.1 O Wiki não é indexável

Verificado ao vivo em 2026-10-07:

```
GET https://github.com/thepaneb/vscode-utplsql/wiki  →  HTTP/2 200
x-robots-tag: none
```

O GitHub bloqueia a indexação de Wikis desde ~2012 (spam), confirmado na
[discussão oficial](https://github.com/orgs/community/discussions/4992). Logo,
as **26 páginas** geradas em `docs/wiki/` não aparecem em buscadores. O conteúdo
existe, é bom e bilíngue — mas ninguém chega até ele por busca.

### 2.2 O que já é indexável hoje

- A página do repositório (`github.com/thepaneb/vscode-utplsql`) responde 200 sem
  `x-robots-tag` — o README é indexável, mas é **uma única URL** dentro do domínio
  `github.com`.
- A página do Marketplace é de terceiros e não controlamos title/meta/structured
  data.

### 2.3 O que já existe para reaproveitar

- `docs/wiki/` (26 páginas), `docs/functional/`, `docs/prd/` e `CHANGELOG.md` são
  **gerados** por `npm run brain:build` a partir do vault (`docs/brain`).
- **23 READMEs** de idioma (`README.<locale>.md`) — matéria-prima de i18n e
  `hreflang`.
- Pipeline `brain:ci` já valida links e fidelidade — o site deve entrar nele.

### 2.4 O que falta

- Nenhum Pages está ativo: `https://thepaneb.github.io/vscode-utplsql/` → **404**.
- Não há `robots.txt`, `sitemap.xml`, `canonical`, OG ou JSON-LD em lugar nenhum.
- Não há decisão sobre domínio (`github.io` vs domínio próprio).

## 3. Objetivos / Não-objetivos

**Objetivos**
- Landing page pública indexável em `https://thepaneb.github.io/vscode-utplsql/`
- SEO técnico mínimo: `<title>`/`meta description` únicos, `canonical`,
  Open Graph/Twitter, JSON-LD `SoftwareApplication`, `sitemap.xml`, `robots.txt`
- Deploy automático via **GitHub Actions** (sem limite de 10 builds/hora)
- Não quebrar as validações do cérebro (`brain:ci`, `docs:check`) nem o VSIX

**Não-objetivos**
- Domínio próprio nesta fase (decidido usar `github.io`; ver RF5/rollout)
- Reescrever a extensão ou adicionar dependências de runtime ao VSIX
- CMS, backend, contas de usuário ou analytics com dados pessoais
- Migrar os 23 READMEs como páginas traduzidas (fase 2)

## 4. Requisitos

### RF1 — Landing page estática

Uma página pública com hero (nome, tagline), features (a partir do README),
instalação/quick start, screenshots e CTAs para Marketplace, repositório e Wiki.
Deve funcionar sem build server, apenas HTML/CSS estático gerado a partir de
`site/`.

### RF2 — Deploy no GitHub Pages via Actions

Workflow `pages.yml` usando `actions/configure-pages`,
`actions/upload-pages-artifact` e `actions/deploy-pages` (artefato = `site/`).
Dispara em `push` para `main` (paths de `site/**`) e `workflow_dispatch`.

### RF3 — SEO técnico

Por página: `<title>` e `<meta name="description">` únicos; `<link rel="canonical">`;
Open Graph + Twitter card; JSON-LD `schema.org/SoftwareApplication`; `lang` correto;
alt text em imagens. Na raiz: `robots.txt` permissivo (allow, sitemap apontado) e
`sitemap.xml`.

### RF4 — Integração com o pipeline de docs (fase 2 → PRD-97)

A documentação completa dentro do site (portar `docs/wiki/**`, reescrever links
wiki → web, sitemap completo e `hreflang`) foi **separada** para a **PRD-97** —
esta PRD entrega a landing page a partir do vault (`80-Site`).

### RF5 — Domínio e canonicalização

Fase 1: `thepaneb.github.io/vscode-utplsql`. Se/quando migrar para domínio próprio,
manter `canonical` e redirects para evitar a perda temporária de indexação já
observada em migrações tardias (ver §8).

### RF6 — Governança do conteúdo publicado

O conteúdo do site nasce sob os controles do repo (nada de protótipo solto):

- `brain:build` **gera** `site/index.html` do vault, resolvendo `{{VERSION}}`
  (de `package.json`) e `{{SITE_URL}}` — versão e URL sem drift manual;
- `docs:check` ganha a seção **“Site (GitHub Pages)”**: valida SEO técnico,
  `canonical`, `robots.txt`, `sitemap.xml` e links locais;
- `brain:gaps` cobre `site/**`, com os arquivos referenciados por notas `COD-*`
  geradas pelo `brain:sync`;
- `.vscodeignore` mantém `site/**` fora do VSIX (travado por teste).

**Não-funcionais**
- RNF1 — Nenhum arquivo do site entra no `.vsix` (adicionar `site/**` ao
  `.vscodeignore`).
- RNF2 — `npm run brain:ci` e `npm run docs:check` seguem verdes; o workflow novo
  é referenciado por uma nota `PIPE-pages` (gerada por `brain:sync`).
- RNF3 — PageSpeed mobile ≥ 90 (HTML estático único, CSS curto em arquivo
  externo, sem JS de terceiros bloqueante).
- RNF4 — O deploy **não substitui o CI**: a validação (`brain:ci` +
  `docs:check` + testes) roda no PR antes do merge.

## 5. Solução proposta

### 5.1 Estrutura

```
site/
├── index.html          # landing page (SEO completo)
├── 404.html
├── robots.txt
├── sitemap.xml         # 1 URL (home)
├── google*.html        # verificação do Search Console
└── assets/
    └── styles.css
.github/workflows/pages.yml
```

### 5.2 Geração de conteúdo

- **Fase 1 (implementada)**: `site/index.html` é **gerado** pelo `brain:build` a
  partir da nota `80-Site/Landing page (site)` (`publicar: site/index.html`), com
  os tokens `{{VERSION}}` (de `package.json`) e `{{SITE_URL}}`. O banner
  “GENERATED” entra logo após o `<!doctype>` (antes dele a página cairia em
  quirks mode). É mais um artefato gerado, como `docs/wiki` e `docs/functional`.
- **Fase 2**: demais artefatos (`robots.txt`/`sitemap.xml`/`404`/CSS) também
  gerados e a doc completa em `site/docs/`, com reescrita de links wiki → web.

### 5.3 SSG — avaliação

| Opção | Prós | Contras | Veredito |
|---|---|---|---|
| HTML estático | zero dependência, deploy imediato | doc em Markdown exige script próprio | **v1** |
| Jekyll | nativo do Pages, consome Markdown, plugins SEO | Ruby/Gemfile num repo Node | alternativa p/ fase 2 |
| Astro/Starlight | melhor SEO moderno, i18n, sitemap, busca | `npm install` + `package.json` extra | candidato forte p/ fase 2 |
| Docusaurus | i18n maduro | React pesado | não recomendado aqui |

Decisão: **HTML estático na fase 1** (menor risco, deploy já no ar) e reavaliar
Jekyll/Astro quando a doc Markdown entrar (fase 2).

### 5.4 SEO e i18n

- `hreflang` fica para a fase 2 (quando houver páginas traduzidas de verdade).
- `sitemap.xml` estático na fase 1; gerado pelo SSG na fase 2.
- `canonical` sempre absoluto para `https://thepaneb.github.io/vscode-utplsql/`.
- Publicar também um `404.html` (o Pages serve esse arquivo automaticamente).

## 6. Configuração

- **GitHub → Settings → Pages**: Source = **GitHub Actions**.
- Novo workflow `.github/workflows/pages.yml` (job `deploy`, permissões
  `pages: write`, `id-token: write`, environment `github-pages`).
- Nenhuma setting/comando novo na extensão.

## 7. Plano de testes

- **Local**: `python3 -m http.server` em `site/` e inspeção de HTML/meta.
- **CI**: `docs:check` valida a seção “Site (GitHub Pages)” (SEO técnico,
  `canonical`, `robots.txt`, `sitemap.xml`, links locais e versão); `brain:ci`
  cobre `site/**` no `brain:gaps` e gera a `PIPE-pages`.
- **SEO**: `site:thepaneb.github.io` no Google e Bing após o deploy; validar com
  Rich Results Test (JSON-LD) e Lighthouse (mobile).
- **Validação manual**: `curl -I` no site confirmando **ausência** de
  `x-robots-tag: none`; conferir `robots.txt` e `sitemap.xml`.
- **Regressão**: `npm run brain:ci`, `npm run docs:check`, `npm run package`
  (VSIX sem arquivos de `site/`).

## 8. Riscos e mitigação

| Risco | Mitigação |
|---|---|
| Wiki continuar invisível e dividir autoridade | `canonical` apontando para o site (fase 2) ou descontinuar o Wiki |
| Migrar depois para domínio próprio e cair a indexação | decidir cedo; se migrar, `canonical` + redirects e reenvio de sitemap |
| Site entrar no VSIX | `site/**` no `.vscodeignore` (RNF1) |
| `brain:gaps` acusar o workflow novo | nota `PIPE-pages` gerada por `brain:sync` (RNF2) |
| Banda (100 GB/mês soft) estourada | conteúdo leve; se crescer, CDN na frente |
| Conteúdo duplicado README ↔ site | fonte única no vault; `canonical` no site; README linka para o site |

## 9. Rollout

- **Fase 1** (0.15.0, esta PRD): landing page + Pages via Actions + SEO técnico
  + governança (`docs:check`/`brain:gaps`/`PIPE-pages`).
- **Fase 2** (PRD-97): portar `docs/wiki/**` ao site, `sitemap` completo e
  `hreflang`.
- **Fase 3 (opcional)**: domínio próprio + `canonical`/redirects + Search Console.
- Entry no `CHANGELOG.md`; publicação via GitHub release (`publish.yml`) não muda.

## 10. Critérios de aceite

- [x] `https://thepaneb.github.io/vscode-utplsql/` no ar, sem `x-robots-tag: none`
- [x] `robots.txt` e `sitemap.xml` acessíveis; `canonical` absoluto correto
- [x] `<title>`, meta description, OG e JSON-LD `SoftwareApplication` presentes
- [x] `site/index.html` **gerado** do vault (`brain:build -- check` sem drift)
- [x] `docs:check` → “Site (GitHub Pages)” verde; `brain:gaps` cobre `site/**`
- [x] `npm run brain:ci` + `npm run docs:check` verdes; `PIPE-pages` existe
- [x] VSIX (`npm run package`) sem arquivos de `site/`
- [ ] Lighthouse mobile ≥ 90 — acompanhamento externo
- [ ] Página indexada (`site:` no Google/Bing) — acompanhamento no Search Console

> Lighthouse e indexação são verificações **externas** e seguem sendo
> acompanhadas; não bloqueiam a conclusão da Fase 1.

## 11. Questões em aberto

- Descontinuar o Wiki como face pública ou mantê-lo espelhado com `canonical`?
- Melhor SSG para a fase 2 (Jekyll nativo vs Astro/Starlight)?
- Vale usar um domínio próprio já na fase 1 (`*.dev`/`*.io`) para não migrar depois?
- Incluir busca no site (Pagefind/Lunr) ou deixar links para o GitHub?

## 12. Impacto no cérebro

Materializada pela regra **`BR-SITE-001`** (landing page gerada de `site/`,
publicada via `pages.yml`, verificada por `docs:check`, sem `noindex`),
referenciada no funcional `10-development-tooling`. Notas geradas:
`PIPE-pages`, `80-Site/Landing page (site)` e as `COD-*` de `site/`. O campo
`regras:` é derivado pelo `brain:sync`. A fase 2 (doc no site) fica na PRD-97.

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - PRDs]]
- 📐 Regras: [[BR-SITE-001 - Landing page gerada de site e publicada no GitHub Pages, sem noindex|BR-SITE-001]]
- 🔗 PRDs relacionados: [[prd-97-doc-no-site|PRD-97]]
- ⚙️ Pipelines: [[PIPE-pages - Deploy Pages|PIPE-pages]]
- 🎯 RNF1 — Nenhum arquivo do site entra no `.vsix` (adicionar `site/**` ao → [[BR-SITE-001 - Landing page gerada de site e publicada no GitHub Pages, sem noindex|BR-SITE-001]]
- 🎯 RNF2 — `npm run brain:ci` e `npm run docs:check` seguem verdes; o workflow no → [[BR-SITE-001 - Landing page gerada de site e publicada no GitHub Pages, sem noindex|BR-SITE-001]]
- 🎯 RNF3 — PageSpeed mobile ≥ 90 (HTML estático único, CSS curto em arquivo → [[BR-SITE-001 - Landing page gerada de site e publicada no GitHub Pages, sem noindex|BR-SITE-001]]
- 🎯 RNF4 — O deploy **não substitui o CI**: a validação (`brain:ci` + → [[BR-SITE-001 - Landing page gerada de site e publicada no GitHub Pages, sem noindex|BR-SITE-001]]
- 🚀 ⬅️ release anterior: [[prd-94-vscode-floor-1-101|PRD-94 (0.14.0)]] · ➡️ próxima release: [[prd-56-duration-persistence|PRD-56 (0.16.0)]]
<!-- brain:auto:end -->
