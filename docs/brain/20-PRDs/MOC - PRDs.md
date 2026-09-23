---
tipo: moc
status: ativo
tags: [moc, prd]
---

# MOC - PRDs

Fonte da verdade: `docs/prd/`. **Não duplique** o conteúdo aqui — linke.

- Índice: [docs/prd/index.md](../../../docs/prd/index.md)
- Template: [template.md](../../../docs/prd/template.md)

## Fluxo de PRDs

1. Editar/mover arquivo em `docs/prd/`.
2. Atualizar `index.md`.
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
- 🟡 Em desenvolvimento: **1**
- 🟢 Concluídos: **66**

Detalhe completo (fonte da verdade): [docs/prd/index.md](../../prd/index.md)
<!-- brain:auto:end -->

> Os PRDs ficam **fora** do vault (`docs/prd/`), então o Dataview não os enxerga.
> Por isso o resumo é gerado do repo:
> `npm run brain:sync`.

## Documentação no repo

- [wiki/PRDs](../../../docs/wiki/PRDs.md)
- [functional/README](../../../docs/functional/README.md)
