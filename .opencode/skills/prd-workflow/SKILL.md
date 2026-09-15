---
name: prd-workflow
description: Manage the PRD lifecycle in this repo — create a PRD, move it between proposed/approved/in-progress/completed, keep docs/prd/index.md tables and Estrutura in sync, and sync GitHub issues/labels. Use when creating, approving, implementing or concluding a PRD, moving a PRD file, or when asked about PRDs / prd issues / roadmap.
compatibility: opencode
---

# PRD Workflow

Os PRDs vivem em `docs/prd/`. A **pasta é a fonte da verdade do status**. Quatro
artefatos devem ficar sempre consistentes (`docs/prd/index.md` → "Manutenção e
sincronia"):

```
Status do arquivo  ←→  Pasta  ←→  Tabela em index.md  ←→  Label GitHub
```

| Status no arquivo | Pasta | Seção no index.md | Label GitHub |
|---|---|---|---|
| Proposto | `proposed/` | ⚪ Propostos | `prd:proposed` |
| Aprovado | `approved/` | 🔵 Aprovados | `prd:approved` |
| Em desenvolvimento | `in-progress/` | 🟡 Em desenvolvimento | `prd:in-progress` |
| Concluído | `completed/` | 🟢 Concluídos | `prd:completed` |

O status é lido do cabeçalho do arquivo, em uma destas formas:

- tabela: `| Status | Proposto |`
- seção: `## Status` seguida da linha com o valor

## Criar (Proposto)

1. `cp docs/prd/template.md docs/prd/proposed/prd-<NN>-<slug>.md` (NN = próximo
   sequencial de 2 dígitos; slug em kebab-case).
2. Preencher o cabeçalho (Status, Autor, Data, Versão alvo, Arquivos afetados…).
3. Adicionar a linha em **⚪ Propostos** e o arquivo na árvore **Estrutura** do
   `index.md`.
4. `npm run sync-prds` (cria a issue no GitHub).

## Aprovar / Implementar / Concluir

Mover o status é sempre a mesma sequência:

1. `git mv docs/prd/<pasta-antiga>/<arquivo>.md docs/prd/<pasta-nova>/<arquivo>.md`
2. Mover a linha de tabela para a seção do novo status no `index.md`.
3. Atualizar a árvore **Estrutura** no `index.md`.
4. Ao **concluir**: preencher a coluna **Versão** e registrar no `CHANGELOG.md`.
5. `npm run sync-prds` (atualiza label / fecha a issue).

## Sincronização com GitHub

```sh
# WSL: o token precisa chegar ao node.exe
export GITHUB_TOKEN="$(sed -n 's/^GITHUB_TOKEN=//p' .env | tr -d '\r' | sed -e 's/^"//' -e 's/"$//')"
export WSLENV="GITHUB_TOKEN${WSLENV:+:$WSLENV}"
npm run sync-prds
```

- `sync-prds.cjs` fecha a issue de PRDs `completed` e ajusta as labels.
- ⚠️ **Nunca** edite `docs/prd/.prd-issues.json` à mão — é cache do script.

## Verificação (obrigatória)

- [ ] `npm run docs:check` → valida pasta ↔ `index.md` ↔ status (roda no CI)
- [ ] `npm run brain:sync && npm run brain:check` → atualiza/valida o vault
      (o `sync-prds` já chama `brain:sync` no fim)
- [ ] `CHANGELOG.md` atualizado ao concluir

## Armadilhas

- `docs/prd/index.md` lista cada PRD **uma única vez** no roadmap (a árvore
  Estrutura repete o nome, mas sem link — não conta).
- Não crie PRD sem número sequencial nem mude a pasta sem editar o `index.md`.
- Publicação é só via release do GitHub (`publish.yml`); `npm run publish` local é
  bloqueado. Local: `npm run package`.

## Referências

- `docs/prd/index.md` — regras completas de manutenção
- `docs/prd/template.md` — molde
- `.opencode/skills/docs-fidelity` — fidelidade documental geral (README, wiki, vault)
