# PRD-85 — ponto de retomada (second brain + MCP)

> Handoff para continuar após reiniciar o opencode. Sessão original:
> `ses_f33a541ebffeglarVRk1ePC8LT`.
> Retomar: `opencode --continue` (ou `opencode --session ses_f33a541ebffeglarVRk1ePC8LT`).

## Objetivo

Tornar `docs/brain/` (vault Obsidian) a fonte da verdade versionada do projeto,
com artefatos do repo **gerados** a partir dele, e usar o Obsidian via **MCP**.
PRD: `docs/prd/in-progress/prd-85-brain-source-of-truth.md` (issue **#115**).
ADR: `docs/brain/30-Decisoes/ADR-002 - Vault como fonte da verdade.md`.

## Estado atual (commits)

| Commit | Conteúdo |
|---|---|
| `b2be3ff` | vault versionado + `opencode.json` (MCP) + PRD-85/ADR-002 |
| `02aead6` | 59 regras `BR-*` + `brain-rules` + stack/deps no `brain:sync` |
| `916a1e8` | `docs/functional` migrado para o vault + `brain:build` |
| `1274c7b` | camadas `SEC-*` (10) e `ERR-*` (11) |
| `82b60a4` | camadas `PAT-*` (7), `TPL-*` (7), `GLOSS-*` (10), `NFR-*` (8), `ENT-*` (6) |
| `929ad9a` | PRD-85 movida para `in-progress/` (label `prd:in-progress`) |

Vault: **170 notas**. Validações: `brain:check`, `brain:rules` (59), `brain:build check`
(0 drift), `docs:check`, `lint`, testes (8/8).

## Decisões tomadas

- Fonte canônica: **texto humano no vault**; fatos técnicos (settings/comandos/
  versão/deps) fluem **código → vault** (`brain:sync`). Regras são **código-first**.
- Vault **versionado** no repo; ignorados: `.env`, `workspace*.json`, `graph.json`,
  `plugins/*/main.js|styles.css`, `obsidian-local-rest-api/data.json`, `.trash/`,
  `90-Daily/`.
- MCP do Obsidian via plugin **Local REST API** (servidor embutido, HTTP 27123).
  Sem mirrored: **portproxy** no Windows + firewall para a sub-rede do WSL.
  `opencode.json` usa MCP **local** com `scripts/obsidian-mcp.py` (bridge
  stdio<->HTTP nativo do WSL) que resolve host+API key em tempo de start — não
  depende de env do shell. `mcp-remote` foi descartado (descartava o `initialize`
  enviado imediatamente). Confirmado: `opencode mcp list` → `✓ obsidian connected`.

## Comandos

```sh
npm run brain:sync      # código -> vault (stack, deps, índices)
npm run brain:build     # vault -> repo (docs/functional/*) ; "check" = drift
npm run brain:check     # wikilinks/links do vault
npm run brain:rules     # schema das BR-* + referências de todas as notas
npm run docs:check      # consistência versionada (CI)
npm run test:unit       # compile + lint + node --test
```

## Pendências (retomar)

1. **Iniciar uma sessão NOVA do opencode** (não `-c`) para que as tools do MCP
   `obsidian` sejam carregadas — continuar a sessão antiga pode não reinjetar a
   lista de tools. Confirmar com `opencode mcp list`.
2. **Wiki (24 páginas)** — decidir estratégia **A/B/C** para 28 refs `images/` e 1
   link relativo: (A) copiar imagens p/ o vault; (B) manter canônico no repo;
   (C) reescrever links no vault.
3. **README + 23 variantes** — mesma decisão (links `README.<locale>.md`, imagens).
4. **PRDs canônicos no vault** — status sai da pasta p/ o frontmatter; reescrever
   `sync-prds.cjs`; `index.md`/Estrutura gerados por `brain:build`.
5. **Fase 5/6 — CI de drift**: `brain:build && git diff --exit-code`; adaptar
   `docs:check`/`docs:fidelity` e `wiki.yml`.
6. **Docs/instruções**: reescrever `AGENTS.md` (local), skill `docs-fidelity`
   (direção invertida), `docs/brain/README.md`, `CONTRIBUTING.md`; ajustar
   `brain.cjs` (`readme-variants`/`wiki-index`/`funcional-index`/`prd-summary`
   deixam de fazer sentido repo→vault).
7. **Camadas** `PIPE-*` (workflows) e `LOC-*` (i18n/23 idiomas) — geradas.
8. **ADRs retrospectivos** a partir dos 66 PRDs concluídos.
9. **Validador**: `--check-lines`; schema de `SEC/ERR/PAT/...` (hoje só refs);
   testes do `brain-build`.
10. **Governança**: fluxo de PR + `CODEOWNERS` do vault; destino de
    `docs/analise*.md`, `docs/rebranding-rascunho.md`, `docs/linkedin/`.
11. **Operacional WSL**: se o Windows reiniciar e a sub-rede mudar, refazer a regra
    de firewall do portproxy (`remoteip=172.21.16.0/20`).
12. `CHANGELOG.md` quando a PRD-85 concluir.

## Estrutura do vault (novas pastas)

`11-Stack`, `13-Padroes`, `14-NFR`, `15-Regras`, `16-Seguranca`, `17-Componentes`,
`18-Erros`, `19-Glossario`, `10-Projeto/Funcional`, `10-Projeto/Dominio`.
