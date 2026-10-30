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
├── assets/          ← cards 1200×627 (pt/en) + gen-cards.cjs
└── en/              ← espelho em inglês (features/ + releases/, mesmo NN)
```

## Gráficos (cards)

Todo post traz um card 16:9 no topo, referenciado por caminho relativo
(`../assets/<id>.png`; no `en/`, `../../assets/<id>-en.png`). Gere todos de uma
vez com `node docs/linkedin/assets/gen-cards.cjs` (SVG → PNG via `@resvg/resvg-js`,
mesma lib dos diagramas da wiki). Ao criar um post, adicione o card dele ao
`gen-cards.cjs` (versões pt e en) e rode o script.

## Modelo do post (obrigatório)

Todo post de feature segue o mesmo formato:

1. **Gancho** — 1 linha, começa com um **emoji** (o mesmo do card).
2. **Imagem** — `![título](../assets/<id>.png)` logo após o gancho.
3. **Contexto** — 1 parágrafo do problema.
4. **Bullets** — 3–4 itens com o destaque em `**negrito**` e um marcador
   emoji (🔹/✅/🚀/⚠️) para compensar a formatação pobre do LinkedIn.
5. **Fecho** — 1–2 frases de benefício.
6. **Links fixos** — landing page (GitHub Pages), **repositório no GitHub** e
   **Marketplace** (os três, sempre, com emoji) e **hashtags** na última linha.

Emojis concentram-se no **gancho**, no **CTA**, nos **links** e no **badge do
card**; nos bullets, use um marcador (🔹/✅/🚀) para compensar a formatação pobre
do LinkedIn — sem exagerar a ponto de poluir.

### Post de release — bloco da matriz de bancos (obrigatório)

Todo post de **release** fecha os destaques com um bullet da **matriz de bancos**
(como os posts `05`–`10`), com:

- as **6 versões** validadas: `11.2 (11g, thick-only)`, `12c R2`, `18c XE`,
  `19c EE`, `21c XE`, `23ai Free` (a lista canônica é
  `scripts/db-matrix/matrix.env`);
- os **modos**: **thin** (suíte de integração completa) e **thick** (`--thick`),
  dizendo o que cada um cobre quando os números diferem;
- o **resultado real** da última execução (X testes por banco, 0 falhas) — nunca
  estimado. Se a matriz não foi rodada para a versão, registre o que foi validado
  (ex.: thin+thick verdes) e rode a matriz antes de publicar.

O **card** do release deve refletir a matriz no subtítulo (ex.:
`matriz thin+thick 5/5`) ou em um bullet.

### Onde registrar os números

A execução da matriz não fica num arquivo do repo: registre os números no
`docs/linkedin/README.md` (nota do release) e, se houver, na nota do vault que
descreve a versão (ex.: `Roadmap - <versão> (execução)`), para o post ser
rastreável.

## Cobertura de features (novo padrão)

Toda feature de usuário do README precisa de um **post dedicado** (pt+en). O
índice canônico feature → post fica em `docs/linkedin/README.md`; ao
adicionar/mudar uma feature, atualize a tabela, o post, o card e o `en/`.

Ângulos secundários (ex.: statement × views, debug × variações, filtro ×
comando) são posts complementares, não features novas; a tabela aponta o post
principal e os secundários.

## Gatilhos — o que fazer quando o projeto muda

| Mudança no projeto | Ação |
|---|---|
| Feature nova/alterada (bullet do README) | criar/atualizar post de feature pt+en |
| Versão publicada (release) | criar post de release pt+en, com o **bloco da matriz de bancos** |
| Nova versão do Oracle na matriz / utPLSQL por banco | atualizar a matriz no post da versão e nos cards de release |
| Feature removida/renomeada ou comportamento alterado | corrigir os posts que a citam |
| Números mudam (testes, PRDs, matriz) | atualizar o post da versão |
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
   - PRDs da versão: `grep "| X.Y.Z |" docs/prd/index.md | wc -l`;
   - **matriz de bancos**: `scripts/db-matrix/run.sh` (thin) e `--thick` → X testes
     por banco, 0 falhas (versões em `scripts/db-matrix/matrix.env`).
4. Destaque 5–7 itens de peso + correções relevantes.
5. **Bullet final obrigatório:** matriz de bancos (5 versões + thin/thick + números).
6. pt + en; card do release com a matriz no subtítulo; atualize a árvore.

## Regras

- **pt é a fonte; en espelho** (mesmo `NN` e ordem).
- **Não reescrever posts de releases antigos** (são histórico). Só o atual/próximo.
- **Sem números/locais inventados**: derive do repo.
- Toda afirmação de implementação deve refletir o estado atual (ex.: não citar
  `type_mapping`/`ut_file_mapper`/CLI/Java — removidos; cobertura de views é via `V$SQL`).
- Link fixo ao final: **landing page** (`https://thepaneb.github.io/vscode-utplsql/`),
  **repositório** (`https://github.com/thepaneb/vscode-utplsql`) e
  **Marketplace** (`https://marketplace.visualstudio.com/items?itemName=paneb.vscode-utplsql`);
  hashtags na última linha.

## Obter números

```sh
grep -m1 '"version"' package.json
grep "| 0.12.0 |" docs/prd/index.md | wc -l    # troque 0.12.0 pela versão
npm run test:unit 2>&1 | grep '^ℹ tests'

# matriz de bancos (versões canônicas em scripts/db-matrix/matrix.env)
scripts/db-matrix/run.sh            # thin: suíte de integração completa por banco
scripts/db-matrix/run.sh --thick    # thick: Instant Client (thickMode) por banco
```

## Verificação (obrigatória)

- [ ] pt e en existem para cada post novo, com a mesma numeração/slug
- [ ] card gráfico em `assets/` (par pt/en) e referenciado no topo do post
- [ ] **todos os links fixos**: landing page + GitHub + Marketplace
- [ ] emojis no gancho, no CTA, nos links e como marcador dos bullets
- [ ] **post de release**: bullet da matriz de bancos (6 versões + thin/thick) e card com a matriz
- [ ] toda feature do README tem um post (índice em `docs/linkedin/README.md`)
- [ ] árvore de `docs/linkedin/README.md` reflete as pastas
- [ ] nenhum termo obsoleto como feature atual: `grep -rn "build_file_mappings\|type_mapping" docs/linkedin` (CLI/Java só podem aparecer como histórico, ex.: release 0.12.0)
- [ ] números conferem com o repo (testes/PRDs/matriz)
- [ ] `npm run brain:sync && npm run brain:check` (índice do vault)
- [ ] `git status` limpo (a pasta é gitignored)

## Armadilhas

- `docs/linkedin/` é **gitignored** — não incluir em commits.
- **Little Text:** o `commentary` da Posts API trata `(`, `)`, `[`, `]`, `@`,
  `*`, `_`, `~`, `|`, `{}`, `<>` e `\` como markup; sem escape o post trunca no
  primeiro `(` e ainda retorna **201**. O `publish.cjs` escapa automaticamente
  (`escapeLittleText`, preservando `#hashtags`); posts copiados manualmente no
  editor web não são afetados.
- A publicação da extensão é via **GitHub release** (`publish.yml`); este skill
  cuida só dos posts, não do release.
- `brain:sync` só regenera o índice; não copia o conteúdo para o vault.
- Ao adicionar bullet de feature ao README, atualize também as 23 variantes e a
  wiki (skill **`docs-fidelity`**) — o post do LinkedIn vem depois, com as
  mesmas features.
