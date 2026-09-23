---
tipo: moc
status: ativo
tags: [moc, prd]
---

# MOC - PRDs

Fonte da verdade: as notas `prd-*` desta pasta. O status é o campo `status:` do
frontmatter; os arquivos `docs/prd/**` e o `index.md` são **gerados**
(`npm run brain:build`). **Não duplique** o conteúdo aqui — linke.

- Índice gerado: [docs/prd/index.md](../../../docs/prd/index.md)
- Template: [[template-prd]]

## Fluxo de PRDs

1. Criar/editar a nota em `20-PRDs/` (status no frontmatter).
2. `npm run brain:sync` (roadmap/estrutura) + `npm run brain:build` (docs/prd/**).
3. Sincronizar com GitHub:

```sh
export GITHUB_TOKEN="$(sed -n 's/^GITHUB_TOKEN=//p' .env | tr -d '\r' | sed -e 's/^"//' -e 's/"$//')"
export WSLENV="GITHUB_TOKEN${WSLENV:+:$WSLENV}"
npm run sync-prds
```

## Status (gerado)

<!-- brain:auto:start:prd-summary -->
- 📝 Propostos: **17**
- 🔵 Aprovados: **1**
- 🟡 Em desenvolvimento: **0**
- 🟢 Concluídos: **67**

Detalhe completo (fonte da verdade): [docs/prd/index.md](../../prd/index.md)
<!-- brain:auto:end -->

> O status vem do frontmatter das notas desta pasta; `sync-prds.cjs` lê o mesmo
> campo para rotular a issue no GitHub.

## Documentação no repo

- [wiki/PRDs](../../../docs/wiki/PRDs.md)
- [functional/README](../../../docs/functional/README.md)
