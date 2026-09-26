---
tipo: prd-index
status: ativo
titulo: "PRDs — vscode-utplsql"
publicar: docs/prd/index.md
origem: ["MOC - PRDs"]
verificado: 2026-09-23
tags: [prd, indice]
---

# PRDs — vscode-utplsql

Catálogo de Product Requirements Documents da extensão.

---

## Como usar

1. Para **propor** uma mudança: crie uma nota `prd-<NN>-<slug>` em `20-PRDs/`
   (a partir de `_templates/template-prd`) e preencha o frontmatter.
2. Quando aprovado: mude `status: proposed` → `status: approved`.
3. Durante implementação: `status: in-progress`.
4. Quando entregue: `status: completed` e registre `versao:`.

> A **fonte da verdade** do status é o campo `status:` no frontmatter da nota
> (pasta `20-PRDs/`). Os arquivos `docs/prd/**` e este índice são **gerados**
> por `npm run brain:build`. **Não edite os arquivos gerados.**

## Manutenção e sincronia

```
Frontmatter (20-PRDs/)  ──brain:build──►  docs/prd/** (gerado) + index.md (gerado)
        │
        └──sync-prds.cjs──►  label + issue no GitHub
```

### Regras

1. **Status**: `status:` aceita `proposed`, `approved`, `in-progress`,
   `completed`.
2. **Pastas geradas**: a pasta do arquivo gerado (`docs/prd/<status>/`) deriva do
   `status:` do frontmatter.
3. **Índice gerado**: as tabelas do **Roadmap** e a árvore **Estrutura** são
   geradas do frontmatter das notas (`npm run brain:sync`).
4. **Label ↔ Status**: `sync-prds.cjs` lê o `status:` do frontmatter para
   determinar a label GitHub (`prd:proposed`, `prd:approved`, `prd:completed`,
   `prd:in-progress`).

### Fluxo de mudança de status

```
CRIAR (proposed)
  → nova nota em 20-PRDs/ com status: proposed
  → npm run brain:sync && npm run brain:build
  → npm run sync-prds (cria a issue)

APROVAR
  → status: proposed → approved no frontmatter
  → npm run brain:build
  → npm run sync-prds (label prd:approved)

IMPLEMENTAR
  → status: approved → in-progress
  → npm run brain:build
  → npm run sync-prds (label prd:in-progress)

CONCLUIR
  → status: in-progress → completed + versao: <release>
  → npm run brain:build
  → registrar no CHANGELOG.md
  → npm run sync-prds (fecha a issue, label prd:completed)
```

> ⚠️ **Nunca** edite o cache `.prd-issues.json` manualmente. O `sync-prds.cjs`
> gerencia esse arquivo automaticamente.

---

## Roadmap

As tabelas são geradas por `npm run brain:build` a partir do frontmatter das
notas `prd-*`. O índice navegável do vault é a [[MOC - PRDs]].

<!-- prd:roadmap:start -->
<!-- prd:roadmap:end -->

---

## Estrutura

<!-- prd:estrutura:start -->
<!-- prd:estrutura:end -->

---

## Convenções

- **Nome da nota**: `prd-<NN>-<slug>` (NN = sequencial de 2 dígitos, slug em kebab-case).
- **Status**: `status:` no frontmatter é a fonte da verdade.
- **Versão alvo**: a `minor` seguinte se for feature, `patch` se for bugfix.
- **Rollout**: toda PRD concluída vira um entry no `CHANGELOG.md`. A publicação é
  **exclusivamente pelo workflow do GitHub** (criar release) — `npm run publish`
  local é bloqueado.

## Publicação

**NÃO usar `npm run publish` ou `npx vsce publish` localmente.** A publicação é
feita automaticamente pelo workflow `.github/workflows/publish.yml` quando uma
release é publicada no GitHub. O único comando local válido para distribuição é
`npm run package` (gera `.vsix` para testes internos).

## Conexões

<!-- brain:auto:start:conexoes -->
- 🗺️ [[MOC - PRDs]]
- 📚 Origem: `MOC - PRDs`
<!-- brain:auto:end -->
