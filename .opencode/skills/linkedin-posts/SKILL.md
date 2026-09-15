---
name: linkedin-posts
description: Keep the local LinkedIn posts (docs/linkedin) in sync with the current project state as features ship and versions release. Use when adding/changing user-facing features, publishing a release, changing README features/settings, or when asked to "atualizar posts do linkedin", "criar post", "post da versão", "release post" or "divulgação".
compatibility: opencode
---

# LinkedIn Posts

`docs/linkedin/` guarda os posts de divulgação. É **local (gitignored)** — nunca
commitar. O português (raiz) é a fonte; `en/` é espelho com a mesma numeração.
O vault (`docs/brain`) só linka os posts via `npm run brain:sync`.

## Estrutura

```
docs/linkedin/
├── README.md        ← regras + árvore (atualizar ao adicionar post)
├── features/        ← posts por funcionalidade (NN-slug.md)
├── releases/        ← posts por versão (NN-release-vX.Y.Z.md)
└── en/              ← espelho em inglês (features/ + releases/, mesmo NN)
```

## Gatilhos — o que fazer quando o projeto muda

| Mudança no projeto | Ação |
|---|---|
| Feature nova/alterada (bullet do README) | criar/atualizar post de feature pt+en |
| Versão publicada (release) | criar post de release pt+en |
| Feature removida/renomeada ou comportamento alterado | corrigir os posts que a citam |
| Números mudam (testes, PRDs) | atualizar o post da versão |
| README/settings/comandos mudam | revisar posts afetados (claims de implementação) |

## Workflow — post de feature

1. Identifique a feature na lista de bullets do `README.md` e no `docs/functional/`.
2. Próximo `NN` em `features/` (numeração reinicia por categoria; `en/` espelha).
3. Formato: **gancho** (1ª linha) + problema + como a extensão resolve + CTA + hashtags.
4. Crie `features/NN-slug.md` (pt) e `en/features/NN-slug-en.md` (en).
5. Atualize a árvore em `docs/linkedin/README.md`.

## Workflow — post de release

1. Versão de `package.json` → `releases/NN-release-vX.Y.Z.md` (+ `en/`).
2. Entregas: PRDs concluídos na versão (tabela de `docs/prd/index.md`) + `CHANGELOG.md`.
3. **Números reais** (nunca inventar):
   - testes unitários: `npm run test:unit` → linha `ℹ tests N`;
   - PRDs da versão: `grep "| X.Y.Z |" docs/prd/index.md | wc -l`.
4. Destaque 5–7 itens de peso + correções relevantes.
5. pt + en; atualize a árvore.

## Regras

- **pt é a fonte; en espelho** (mesmo `NN` e ordem).
- **Não reescrever posts de releases antigos** (são histórico). Só o atual/próximo.
- **Sem números/locais inventados**: derive do repo.
- Toda afirmação de implementação deve refletir o estado atual (ex.: não citar
  `type_mapping`/`ut_file_mapper`/CLI/Java — removidos; cobertura de views é via `V$SQL`).
- Links fixos ao final: repositório + Marketplace; hashtags na última linha.

## Obter números

```sh
grep -m1 '"version"' package.json
grep "| 0.12.0 |" docs/prd/index.md | wc -l    # troque 0.12.0 pela versão
npm run test:unit 2>&1 | grep '^ℹ tests'
```

## Verificação (obrigatória)

- [ ] pt e en existem para cada post novo, com a mesma numeração/slug
- [ ] árvore de `docs/linkedin/README.md` reflete as pastas
- [ ] nenhum termo obsoleto: `grep -rn "build_file_mappings\|type_mapping\|utPLSQL-cli" docs/linkedin`
- [ ] números conferem com o repo (testes/PRDs)
- [ ] `npm run brain:sync && npm run brain:check` (índice do vault)
- [ ] `git status` limpo (a pasta é gitignored)

## Armadilhas

- `docs/linkedin/` é **gitignored** — não incluir em commits.
- A publicação da extensão é via **GitHub release** (`publish.yml`); este skill
  cuida só dos posts, não do release.
- `brain:sync` só regenera o índice; não copia o conteúdo para o vault.
- Ao adicionar bullet de feature ao README, atualize também as 23 variantes e a
  wiki (skill **`docs-fidelity`**) — o post do LinkedIn vem depois, com as
  mesmas features.
