---
name: docs-fidelity
description: Keep every project document faithful to the current code and refresh the Obsidian vault (docs/brain). Use when a change affects documented behavior, settings, commands, architecture, PRDs, wiki, README or its language variants, or when asked to "update docs" / "atualizar documentação" / "atualizar o brain" / "sincronizar docs".
compatibility: opencode
---

# Documentation Fidelity

Objetivo: após qualquer mudança, **o repo é a fonte da verdade** e todo doc (e o
vault) passa a refletir o estado atual. O vault nunca duplica conteúdo — ele linka
e é regenerado.

## Passo 0 — inventário

Liste o que a mudança afeta e cruze com a tabela abaixo. Só então edite.

| Mudança | Docs a atualizar |
|---|---|
| Feature/comportamento | `docs/functional/`, `docs/wiki/`, README (**bullets de features** no topo + variantes) |
| Setting / comando / keybinding | README (tabela de config, **tabela de Comandos**, Keybindings), `package.json` (`contributes`), `package.nls.*.json` |
| Nova string de UI | `package.nls.json` + `package.nls.<locale>.json` (23) |
| Arquitetura / módulo | `docs/wiki/Architecture.md`, MOCs do vault |
| PRD (criar/aprovar/implementar/concluir) | usar a skill **`prd-workflow`** |
| Feature/versão (divulgação) | posts LinkedIn `docs/linkedin/` → skill **`linkedin-posts`** |
| Correção relevante | `CHANGELOG.md` |
| Sugestão/troubleshooting | README (Troubleshooting) |
| Cobertura Oracle / grants | `docs/wiki/Coverage.md`, README |

## Passo 1 — docs do repo

Regras do repo (ver `AGENTS.md` → "README.md: atualizar tabela de config, Comandos,
Keybindings e Troubleshooting ao adicionar settings/comandos").

**PRD** — ciclo de vida detalhado na skill **`prd-workflow`**. Aqui basta lembrar:
status = pasta, e os 4 artefatos (arquivo, pasta, `index.md`, label) andam juntos.
Ao mudar PRD, rode `npm run sync-prds` (fecha/labela issues e já chama `brain:sync`).

**Wiki** — `docs/wiki/` é publicado automaticamente pelo workflow `wiki.yml`.

**README e variantes de idioma** — `README.md` é a verdade. Se ele mudar, as 23
variantes (`README.<locale>.md`) precisam da mesma alteração — **incluindo os
bullets de features no topo, a tabela de settings e a tabela de Comandos**.
Ao adicionar feature/command, confira a paridade com:
`grep -c '^- ' README.md` vs cada variante e a presença do comando/setting.
Se não der para traduzir agora, **registre a pendência** — o vault marca
automaticamente (⚠️) as variantes cujo último commit é anterior ao do
`README.md`.

## Passo 2 — vault Obsidian

```sh
npm run brain:sync    # regenera índices (functional, PRDs, README variants, wiki, LinkedIn)
npm run brain:check   # valida wikilinks internos + links externos
```

O `brain:sync` é idempotente e nunca deve alterar conteúdo não-gerado. O vault
(`docs/brain/`) é gitignored — não é commitado.

## Passo 3 — verificação (obrigatória)

- [ ] `npm run docs:check` → consistência versionada (README↔variantes, PRD↔index,
      wiki) **+ fidelidade código↔docs**. **Roda no CI.**
- [ ] `npm run docs:fidelity` → checagem focada de fidelidade (só os problemas
      código↔docs; útil durante a edição)
- [ ] `npm run brain:check` → `OK: N notas, todos os links resolvem.` (exit 0)
- [ ] `npm run brain:sync` → `OK: 0 arquivo(s) atualizado(s).` (idempotente)
- [ ] PRD movido/renomeado? `index.md` tabela + Estrutura conferem com as pastas
- [ ] README mudou? variantes sinalizadas/atualizadas
- [ ] `CHANGELOG.md` atualizado se houve correção/feature
- [ ] `npm run lint` passa (se mexeu em `src/`)

## Fidelidade código ↔ docs (o que o docs:fidelity cobre)

`scripts/docs-fidelity.cjs` (testado em `src/test/unit/docsFidelity.test.ts`)
cruza o **código** (fonte da verdade) com a doc versionada e falha em:

| Checagem | Fonte da verdade | Docs conferidos |
|---|---|---|
| Settings sem menção | `package.json` `configuration.properties` | `README.md` |
| Comando de paleta sem menção | `package.json` `commands` + `package.nls.json` | `docs/wiki/Commands.md` |
| Módulo `src/*.ts` não citado | `src/` | `docs/wiki/Architecture.md` |
| Exemplo de `.vsix` em versão antiga | `package.json` `version` | `wiki/FAQ.md`, `wiki/Installation-and-requirements.md` |
| PRD concluído ausente | `docs/prd/completed/` | `docs/wiki/PRDs.md` |
| Termo obsoleto como afirmação | lista (`type_mapping`, `java -jar`) | wiki |

> Ao mexer em settings/comandos/módulos, rode `npm run docs:fidelity` **antes** de
> considerar a tarefa pronta — foi exatamente a brecha que deixou a doc 0.13.0
> desatualizada (doc validava só estrutura, não conteúdo).

## Armadilhas

- **Não copie** docs para o vault — só link. Duplicação = drift.
- Dataview **não** lê fora do vault (`docs/`, `src/`) — por isso os índices são
  gerados por `brain:sync`, não por consulta.
- Blocos automáticos vivem entre `<!-- brain:auto:start:<nome> -->` e
  `<!-- brain:auto:end -->`; nunca edite à mão dentro deles.
- `npm run sync-prds` exige `GITHUB_TOKEN` (+ `WSLENV` no WSL) — ver `AGENTS.md`.
- `docs/linkedin/` é local (não versionado); não o inclua em commits.
- Só commite documentação se o usuário pedir.

## Referências

- `AGENTS.md` — comandos, arquitetura, pontos de atenção
- `.opencode/skills/prd-workflow` — ciclo de vida de PRDs
- `docs/prd/index.md` — regras de manutenção de PRDs
- `scripts/brain.cjs` — tool do vault (`sync`/`check`)
- `scripts/docs-check.cjs` — consistência versionada (`docs:check`)
- `docs/brain/README.md` — convenções do vault
