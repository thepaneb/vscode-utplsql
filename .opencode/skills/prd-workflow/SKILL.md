---
name: prd-workflow
description: Manage the PRD lifecycle in this repo — create a PRD note in the vault (docs/brain/20-PRDs), change its status in the frontmatter, regenerate docs/prd/** with brain:build, and sync GitHub issues/labels. Use when creating, approving, implementing or concluding a PRD, changing a PRD status, or when asked about PRDs / prd issues / roadmap.
compatibility: opencode
---

# PRD Workflow

Os PRDs são **notas do vault** em `docs/brain/20-PRDs/`. A **fonte da verdade do
status é o campo `status:` no frontmatter**. Os arquivos `docs/prd/**` (incluindo
`index.md`) são **gerados** (`npm run brain:build`) — não os edite à mão.

```
Frontmatter (20-PRDs/)  ──brain:build──►  docs/prd/** + index.md (gerados)
        │
        └──sync-prds.cjs──►  label + issue no GitHub
```

| `status:` | Pasta gerada | Seção no index.md | Label GitHub |
|---|---|---|---|
| `proposed` | `proposed/` | ⚪ Propostos | `prd:proposed` |
| `approved` | `approved/` | 🔵 Aprovados | `prd:approved` |
| `in-progress` | `in-progress/` | 🟡 Em desenvolvimento | `prd:in-progress` |
| `completed` | `completed/` | 🟢 Concluídos | `prd:completed` |

## Criar (proposed)

1. Crie `docs/brain/20-PRDs/prd-<NN>-<slug>.md` a partir de
   `docs/brain/_templates/template-prd.md` (NN = próximo sequencial de 2 dígitos;
   slug em kebab-case).
2. Preencha o frontmatter (`id`, `status: proposed`, `titulo`, `versao`, `data`,
   `autor`) e o corpo.
3. Regenerar e sincronizar:
   ```sh
   npm run brain:sync && npm run brain:build
   npm run sync-prds   # cria a issue no GitHub
   ```

## Aprovar / Implementar / Concluir

Mudar o status é sempre a mesma sequência:

1. Edite `status:` no frontmatter da nota (`proposed` → `approved` →
   `in-progress` → `completed`).
2. Ao **concluir**: preencha `versao:` e registre no `CHANGELOG.md`.
3. Regenerar e sincronizar:
   ```sh
   npm run brain:sync && npm run brain:build
   npm run sync-prds   # atualiza label / fecha a issue
   ```

> A mudança de pasta em `docs/prd/**` é feita pelo `brain:build` (e o arquivo da
> pasta antiga é removido automaticamente). Não mova arquivos gerados à mão.

## Sincronização com GitHub

```sh
# WSL: o token precisa chegar ao node.exe
export GITHUB_TOKEN="$(sed -n 's/^GITHUB_TOKEN=//p' .env | tr -d '\r' | sed -e 's/^"//' -e 's/"$//')"
export WSLENV="GITHUB_TOKEN${WSLENV:+:$WSLENV}"
npm run sync-prds
```

- `sync-prds.cjs` lê o `status:` do frontmatter, fecha a issue de PRDs
  `completed` e ajusta as labels.
- ⚠️ **Nunca** edite `docs/prd/.prd-issues.json` à mão — é cache do script.

## Verificação (obrigatória)

- [ ] `npm run brain:sync && npm run brain:build` → regenera `docs/prd/**` +
      `index.md` (Roadmap e Estrutura)
- [ ] `npm run brain:build -- check` → sem drift (roda no CI)
- [ ] `npm run docs:check` → valida pasta ↔ `index.md` ↔ status da saída gerada
- [ ] `npm run brain:check` → valida os links do vault
- [ ] `CHANGELOG.md` atualizado ao concluir

## Armadilhas

- O `index.md` e os arquivos em `docs/prd/**` têm banner
  `<!-- GENERATED ... DO NOT EDIT -->`; edite a **nota do vault**.
- Cada PRD aparece **uma única vez** no roadmap (a árvore Estrutura repete o
  nome, mas sem link — não conta).
- Não crie PRD sem número sequencial.
- Publicação é só via release do GitHub (`publish.yml`); `npm run publish` local é
  bloqueado. Local: `npm run package`.

## Referências

- `docs/brain/20-PRDs/index.md` — índice canônico (regras completas)
- `docs/brain/20-PRDs/MOC - PRDs.md` — MOC
- `docs/brain/_templates/template-prd.md` — molde
- `.opencode/skills/docs-fidelity` — fidelidade documental geral (README, wiki, vault)
