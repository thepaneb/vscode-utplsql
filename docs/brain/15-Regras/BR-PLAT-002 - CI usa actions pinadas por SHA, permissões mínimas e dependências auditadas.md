---
id: BR-PLAT-002
aliases: [BR-PLAT-002]
tipo: regra
titulo: CI usa actions pinadas por SHA, permissões mínimas e dependências auditadas
dominio: plataforma
status: ativo
severidade: alta
fonte: codigo
verificado: 2026-10-29
implementacao: [".github/dependabot.yml", ".github/workflows/ci.yml", ".github/workflows/integration.yml", ".github/workflows/pages.yml", ".github/workflows/publish.yml", ".github/workflows/wiki.yml", ".github/workflows/bing-index.yml", ".github/workflows/google-index.yml", ".github/workflows/pagespeed.yml", ".github/workflows/site-health.yml", "package.json"]
testes: ["src/test/unit/workflowPolicy.test.ts"]
prds: ["PRD-104"]
requisitos: ["PRD-104/RF1", "PRD-104/RF3", "PRD-104/RF4"]
tags: ["plataforma", "ci", "seguranca"]
---
## Enunciado

Todos os workflows usam actions **pinadas por SHA de commit** (com comentário da
versão), declaram `permissions:` no topo com o mínimo necessário, mantêm o
Dependabot semanal para `npm` e `github-actions` e rodam o gate
`npm audit --omit=dev --audit-level=high` no CI. O token do GitHub nunca é
embutido na URL do clone do wiki (usa `http.extraheader` efêmero). O CodeQL
permanece no *default setup* do GitHub — não há `codeql.yml` commitado.

## Pré-condições

Repositório público com Actions habilitadas; Dependabot habilitado no repositório.

## Exceções

`permissions` elevadas são permitidas apenas no job que precisa delas
(`publish` → `contents: write`; `pages` → `pages`/`id-token`; `wiki` →
`contents: write`). Dependabot majors abrem PRs individuais (fora do grupo
minor/patch).

## Justificativa

Reduzir a superfície de ataque da cadeia de suprimentos (supply chain): uma tag
móvel pode ser movida para um commit malicioso; um `permissions` amplo dá ao
workflow mais poder que o necessário; uma dependência de produção vulnerável
chega ao `.vsix`.

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - Regras]]
- 📄 PRDs: [[prd-104-ci-supply-chain|PRD-104]]
- 🎯 Requisitos: [[prd-104-ci-supply-chain|PRD-104 RF1]] · [[prd-104-ci-supply-chain|PRD-104 RF3]] · [[prd-104-ci-supply-chain|PRD-104 RF4]]
- 🧩 Código: [[COD - dependabot.yml]] · [[COD - ci.yml]] · [[COD - integration.yml]] · [[COD - pages.yml]] · [[COD - publish.yml]] · [[COD - wiki.yml]] · [[COD - bing-index.yml]] · [[COD - google-index.yml]] · [[COD - pagespeed.yml]] · [[COD - site-health.yml]] · [[COD - package.json]]
- 🧪 Testes: [[TST - workflowPolicy.test.ts]]
- ↩️ Referenciada por: [[Contributing]] · [[prd-104-ci-supply-chain|PRD-104]]
<!-- brain:auto:end -->
