---
tipo: moc
status: ativo
verificado: 2026-09-23
modulo: documentacao
tags: [moc, docs, i18n]
---

# MOC - Documentação

Mapa de **toda** a documentação do projeto. Nada é copiado: só links ao vivo +
enumerations geradas (`npm run brain:sync`).

## Arquivos da raiz do repo

<!-- brain:auto:start:root-docs -->
- [README.md](../../../README.md) — _2026-09-23_
- [CHANGELOG.md](../../../CHANGELOG.md) — _2026-09-26_
- [CONTRIBUTING.md](../../../CONTRIBUTING.md) — _2026-09-23_
- [SECURITY.md](../../../SECURITY.md) — _2026-07-01_
- [CODE_OF_CONDUCT.md](../../../CODE_OF_CONDUCT.md) — _2026-07-01_
<!-- brain:auto:end -->

## README e variantes de idioma

Notas canônicas em `60-README/`; os `README*.md` na raiz são **gerados**
(`npm run brain:build`). A verdade é a nota [[README (extensão)]].

<!-- brain:auto:start:readme-variants -->
- [[README (extensão)]] — `en` → `README.md`
- [[README.bg]] — `bg` → `README.bg.md`
- [[README.cs]] — `cs` → `README.cs.md`
- [[README.de]] — `de` → `README.de.md`
- [[README.el]] — `el` → `README.el.md`
- [[README.en-GB]] — `en-gb` → `README.en-GB.md`
- [[README.es]] — `es` → `README.es.md`
- [[README.fr]] — `fr` → `README.fr.md`
- [[README.hu]] — `hu` → `README.hu.md`
- [[README.id]] — `id` → `README.id.md`
- [[README.it]] — `it` → `README.it.md`
- [[README.ja]] — `ja` → `README.ja.md`
- [[README.ko]] — `ko` → `README.ko.md`
- [[README.pl]] — `pl` → `README.pl.md`
- [[README.pt-BR]] — `pt-br` → `README.pt-BR.md`
- [[README.ro]] — `ro` → `README.ro.md`
- [[README.ru]] — `ru` → `README.ru.md`
- [[README.sr]] — `sr` → `README.sr.md`
- [[README.th]] — `th` → `README.th.md`
- [[README.tr]] — `tr` → `README.tr.md`
- [[README.uk]] — `uk` → `README.uk.md`
- [[README.vi]] — `vi` → `README.vi.md`
- [[README.zh-CN]] — `zh-cn` → `README.zh-CN.md`
- [[README.zh-TW]] — `zh-tw` → `README.zh-TW.md`
<!-- brain:auto:end -->

## Docs em `docs/`

- **PRDs** → [[MOC - PRDs]] ([index.md](../../../docs/prd/index.md))
- **Especificação funcional** → [[MOC - Funcional]] ([visão geral](Funcional/README.md))
- **Wiki** → ver abaixo
- **LinkedIn** (pasta local, não versionada) → ver abaixo

### GitHub Wiki

Notas canônicas em `70-Wiki/`; `docs/wiki/` é **gerado** (`npm run brain:build`)
e publicado pelo workflow `wiki.yml`.

<!-- brain:auto:start:wiki-index -->
- [[Architecture]]
- [[Commands]]
- [[Configuration-examples]]
- [[Configuration]]
- [[Connection-profiles]]
- [[Connection]]
- [[Contributing]]
- [[Coverage]]
- [[Database-requirements]]
- [[Debugger]]
- [[Diagnostics-and-quick-fix]]
- [[Editor-integration]]
- [[FAQ]]
- [[Home (wiki)]]
- [[Installation-and-requirements]]
- [[Internationalization]]
- [[Invocation-mode]]
- [[Oracle-direct-execution]]
- [[PRDs]]
- [[Quick-start]]
- [[Reporters]]
- [[SQL-scripts]]
- [[Test-explorer]]
- [[Tests]]
- [[Tree-organization]]
- [[Troubleshooting]]
<!-- brain:auto:end -->

### Docs locais (não versionados)

`docs/*` é gitignored exceto `prd/`, `wiki/`, `functional/` e `brain/`. Ficam
locais: `docs/analise.md`, `docs/analise-comparativa.md`,
`docs/rebranding-rascunho.md` e o material de divulgação em `docs/linkedin/`
(posts pt/en + cards, gerenciados pela skill `linkedin-posts`; o índice deles
**não** é persistido aqui para o vault continuar determinístico no CI).

## i18n da extensão (não é doc)

Strings da UI ficam em `package.nls.<locale>.json` na raiz (23 locales) e são
referenciadas como `%nls.*%` no `package.json`.

## Relacionado

- [[MOC - vscode-utplsql]]
- [[MOC - Funcional]]
- [[MOC - PRDs]]
