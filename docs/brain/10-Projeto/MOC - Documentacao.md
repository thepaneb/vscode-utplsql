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
- [CHANGELOG.md](../../../CHANGELOG.md) — _2026-09-23_
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
`docs/rebranding-rascunho.md` e o material de divulgação em `docs/linkedin/`.

<!-- brain:auto:start:linkedin-index -->
- [en/features/01-test-explorer-nativo](../../linkedin/en/features/01-test-explorer-nativo.md)
- [en/features/02-codelens](../../linkedin/en/features/02-codelens.md)
- [en/features/03-atalhos-teclado](../../linkedin/en/features/03-atalhos-teclado.md)
- [en/features/04-menu-contexto](../../linkedin/en/features/04-menu-contexto.md)
- [en/features/05-cobertura-visual](../../linkedin/en/features/05-cobertura-visual.md)
- [en/features/06-decoracoes-inline](../../linkedin/en/features/06-decoracoes-inline.md)
- [en/features/07-status-bar](../../linkedin/en/features/07-status-bar.md)
- [en/features/08-smart-rerun](../../linkedin/en/features/08-smart-rerun.md)
- [en/features/09-oracle-direto](../../linkedin/en/features/09-oracle-direto.md)
- [en/features/10-diagnosticos-setup](../../linkedin/en/features/10-diagnosticos-setup.md)
- [en/features/11-schema-aware-tree](../../linkedin/en/features/11-schema-aware-tree.md)
- [en/features/12-jump-to-failure](../../linkedin/en/features/12-jump-to-failure.md)
- [en/features/13-perfis-conexao](../../linkedin/en/features/13-perfis-conexao.md)
- [en/features/14-function-coverage](../../linkedin/en/features/14-function-coverage.md)
- [en/features/15-cobertura-views](../../linkedin/en/features/15-cobertura-views.md)
- [en/features/16-debug-plsql](../../linkedin/en/features/16-debug-plsql.md)
- [en/features/17-i18n-24-idiomas](../../linkedin/en/features/17-i18n-24-idiomas.md)
- [en/features/18-execucao-de-scripts](../../linkedin/en/features/18-execucao-de-scripts.md)
- [en/features/19-thick-mode-nne](../../linkedin/en/features/19-thick-mode-nne.md)
- [en/features/20-tags-random-order](../../linkedin/en/features/20-tags-random-order.md)
- [en/features/21-coverage-scope](../../linkedin/en/features/21-coverage-scope.md)
- [en/features/22-db-first-discovery](../../linkedin/en/features/22-db-first-discovery.md)
- [en/releases/01-release-v0.10.0](../../linkedin/en/releases/01-release-v0.10.0.md)
- [en/releases/02-release-v0.11.0](../../linkedin/en/releases/02-release-v0.11.0.md)
- [en/releases/03-release-v0.12.0](../../linkedin/en/releases/03-release-v0.12.0.md)
- [en/releases/04-release-v0.12.1](../../linkedin/en/releases/04-release-v0.12.1.md)
- [en/releases/05-release-v0.13.0](../../linkedin/en/releases/05-release-v0.13.0.md)
- [features/01-test-explorer-nativo](../../linkedin/features/01-test-explorer-nativo.md)
- [features/02-codelens](../../linkedin/features/02-codelens.md)
- [features/03-atalhos-teclado](../../linkedin/features/03-atalhos-teclado.md)
- [features/04-menu-contexto](../../linkedin/features/04-menu-contexto.md)
- [features/05-cobertura-visual](../../linkedin/features/05-cobertura-visual.md)
- [features/06-decoracoes-inline](../../linkedin/features/06-decoracoes-inline.md)
- [features/07-status-bar](../../linkedin/features/07-status-bar.md)
- [features/08-smart-rerun](../../linkedin/features/08-smart-rerun.md)
- [features/09-oracle-direto](../../linkedin/features/09-oracle-direto.md)
- [features/10-diagnosticos-setup](../../linkedin/features/10-diagnosticos-setup.md)
- [features/11-schema-aware-tree](../../linkedin/features/11-schema-aware-tree.md)
- [features/12-jump-to-failure](../../linkedin/features/12-jump-to-failure.md)
- [features/13-perfis-conexao](../../linkedin/features/13-perfis-conexao.md)
- [features/14-function-coverage](../../linkedin/features/14-function-coverage.md)
- [features/15-cobertura-views](../../linkedin/features/15-cobertura-views.md)
- [features/16-debug-plsql](../../linkedin/features/16-debug-plsql.md)
- [features/17-i18n-24-idiomas](../../linkedin/features/17-i18n-24-idiomas.md)
- [features/18-execucao-de-scripts](../../linkedin/features/18-execucao-de-scripts.md)
- [features/19-thick-mode-nne](../../linkedin/features/19-thick-mode-nne.md)
- [features/20-filtro-tag-ordem-aleatoria](../../linkedin/features/20-filtro-tag-ordem-aleatoria.md)
- [features/21-escopo-cobertura](../../linkedin/features/21-escopo-cobertura.md)
- [features/22-descoberta-db-first](../../linkedin/features/22-descoberta-db-first.md)
- [releases/01-release-v0.10.0](../../linkedin/releases/01-release-v0.10.0.md)
- [releases/02-release-v0.11.0](../../linkedin/releases/02-release-v0.11.0.md)
- [releases/03-release-v0.12.0](../../linkedin/releases/03-release-v0.12.0.md)
- [releases/04-release-v0.12.1](../../linkedin/releases/04-release-v0.12.1.md)
- [releases/05-release-v0.13.0](../../linkedin/releases/05-release-v0.13.0.md)
<!-- brain:auto:end -->

## i18n da extensão (não é doc)

Strings da UI ficam em `package.nls.<locale>.json` na raiz (23 locales) e são
referenciadas como `%nls.*%` no `package.json`.

## Relacionado

- [[MOC - vscode-utplsql]]
- [[MOC - Funcional]]
- [[MOC - PRDs]]
