---
name: docs-fidelity
description: Keep every project document faithful to the current code and keep the Obsidian vault (docs/brain) as the canonical source. Use when a change affects documented behavior, settings, commands, architecture, PRDs, wiki, README or its language variants, or when asked to "update docs" / "atualizar documentação" / "atualizar o brain" / "sincronizar docs".
compatibility: opencode
---

# Documentation Fidelity

Direção do fluxo:

```
docs/brain/ (texto humano = fonte)  ──brain:build──►  README*, docs/wiki, docs/functional, docs/prd
        ▲                                                      │
        └────────── brain:sync (fatos do código) ─────────────┘
```

- **Texto humano** é editado **no vault** (`docs/brain/`); os artefatos do repo são
  **gerados** e têm banner `<!-- GENERATED FROM ... DO NOT EDIT -->`.
- **Fatos técnicos** (settings, comandos, versão, módulos, deps, contagens) vêm do
  **código**; o `brain:sync` injeta alguns nos MOCs e o `docs:fidelity` confere se a
  doc os menciona.

## Passo 0 — inventário

| Mudança | Onde editar (fonte) | Artefatos gerados |
|---|---|---|
| Feature/comportamento | `10-Projeto/Funcional/`, `70-Wiki/` | `docs/functional/`, `docs/wiki/` |
| Setting / comando / keybinding | nota `60-README/README (extensão)` + 23 variantes, `package.json`, `package.nls.*.json` | `README*.md` |
| Nova string de UI | `package.nls.json` + `package.nls.<locale>.json` (23) | — |
| Arquitetura / módulo | `70-Wiki/Architecture` (+ MOCs) | `docs/wiki/Architecture.md` |
| PRD (criar/aprovar/implementar/concluir) | notas `20-PRDs/` | `docs/prd/**` → skill **`prd-workflow`** |
| Feature/versão (divulgação) | posts LinkedIn `docs/linkedin/` | skill **`linkedin-posts`** |
| Correção relevante | `CHANGELOG.md` (raiz, manual) | — |

## Passo 1 — editar a fonte no vault

Edite a **nota do vault** (nunca o arquivo gerado). Regras de link:

- Nota dentro do vault → `[[Nome da nota]]`.
- Wiki: `[[Página|texto]]` (o build converte p/ link do GitHub wiki).
- README: `[[README.pt-BR|Português]]` (o build converte p/ `README.pt-BR.md`).

**README e variantes** — a nota `60-README/README (extensão)` é a verdade. Se ela
mudar, as 23 variantes (`README.<locale>.md`) precisam da mesma alteração —
**incluindo os bullets de features, a tabela de settings e a de Comandos**. Ao
adicionar setting/command, confira a paridade com `package.json`; o `docs:fidelity`
cobra a menção no `README.md` gerado.

**Wiki** — notas em `70-Wiki/`; `docs/wiki/` é gerado e publicado pelo workflow
`wiki.yml`.

## Passo 2 — gerar e sincronizar

```sh
npm run brain:sync      # fatos do código -> vault (stack, deps, contagens, roadmap/estrutura PRD)
npm run brain:build     # vault -> repo (README*, docs/wiki, docs/functional, docs/prd)
npm run brain:check     # valida wikilinks internos + links externos do vault
```

`brain:sync`/`brain:build` são idempotentes e nunca alteram conteúdo não-gerado.

## Passo 3 — verificação (obrigatória)

- [ ] `npm run brain:ci` → `sync` (0), `build` (0), `check` (links), `rules` (BR-*)
- [ ] `npm run brain:build -- check` → sem drift
- [ ] `npm run docs:check` → consistência versionada (README↔variantes, PRD↔index,
      vault frontmatter, wiki) **+ fidelidade código↔docs**. **Roda no CI.**
- [ ] `npm run docs:fidelity` → checagem focada de fidelidade código↔docs
- [ ] PRD mudou de status? frontmatter + `brain:build` (o `index.md` é gerado)
- [ ] README mudou? variantes atualizadas
- [ ] `CHANGELOG.md` atualizado se houve correção/feature
- [ ] `npm run lint` passa (se mexeu em `src/`)

> O CI roda `npm run brain:ci` + `git diff --exit-code`: se o vault e os artefatos
> gerados divergirem, o build falha.

## Fidelidade código ↔ docs (o que o docs:fidelity cobre)

`scripts/docs-fidelity.cjs` (testado em `src/test/unit/docsFidelity.test.ts`) cruza
o **código** (fonte da verdade) com a doc versionada e falha em:

| Checagem | Fonte da verdade | Docs conferidos |
|---|---|---|
| Settings sem menção | `package.json` `configuration.properties` | `README.md` |
| Comando de paleta sem menção | `package.json` `commands` + `package.nls.json` | `docs/wiki/Commands.md` |
| Módulo `src/*.ts` não citado | `src/` | `docs/wiki/Architecture.md` |
| Exemplo de `.vsix` em versão antiga | `package.json` `version` | `wiki/FAQ.md`, `wiki/Installation-and-requirements.md` |
| PRD concluído ausente | `docs/prd/completed/` | `docs/wiki/PRDs.md` |
| Termo obsoleto como afirmação | lista (`type_mapping`, `java -jar`) | wiki |

> Ao mexer em settings/comandos/módulos, rode `npm run docs:fidelity` **antes** de
> considerar a tarefa pronta.

## Armadilhas

- **Nunca edite arquivos gerados** (têm banner `GENERATED ... DO NOT EDIT`): edite a
  nota do vault e rode `brain:build`.
- Blocos automáticos vivem entre `<!-- brain:auto:start:<nome> -->` e
  `<!-- brain:auto:end -->`; nunca edite à mão dentro deles.
- Wikilinks com **caminho** (`[[pasta/Nota]]`) não resolvem no `brain:check` (só
  basenames) — use o nome da nota ou link markdown.
- `npm run sync-prds` exige `GITHUB_TOKEN` (+ `WSLENV` no WSL) — ver `AGENTS.md`.
- `docs/linkedin/` é local (não versionado); não o inclua em commits.
- Só commite documentação se o usuário pedir.

## Referências

- `AGENTS.md` — comandos, arquitetura, pontos de atenção
- `.opencode/skills/prd-workflow` — ciclo de vida de PRDs
- `docs/brain/20-PRDs/index.md` — regras de manutenção de PRDs
- `docs/brain/README.md` — convenções e pipeline do vault
- `scripts/brain.cjs` — `sync`/`check`
- `scripts/brain-build.cjs` — `build`/`check` (vault → repo)
- `scripts/docs-check.cjs` — consistência versionada (`docs:check`)
